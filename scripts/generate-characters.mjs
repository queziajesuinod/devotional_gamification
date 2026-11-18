/**
 * Generates the character "figurinhas" catalog with Meshy (image-to-image), in waves:
 *   wave 1: standardized bases + accessory sheets (+ looks/hair whose parent already exists)
 *   wave 2+: looks from each base, hair colors from Original/Esporte looks
 *
 * Every job is recorded in assets/characters/manifest.json (task id, parent, file), so the
 * script can be re-run safely: finished jobs are skipped, failed ones retried.
 *
 * Usage: node scripts/generate-characters.mjs [--dry-run]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const MESHY = path.join(execFileSync("npm", ["root", "-g"], { encoding: "utf8", shell: true }).trim(), "meshy-cli/dist/index.js");
const ROOT = process.cwd();
const OUT = path.join(ROOT, "assets/characters");
const RAW = path.join(ROOT, "assets/models/meshy_output/characters");
const MANIFEST = path.join(OUT, "manifest.json");
const DRY = process.argv.includes("--dry-run");

// ---------------- catalog ----------------
const CHARACTERS = {
  davi: {
    who: "boy with short curly brown hair and thick black square glasses",
    hairNow: "curly brown",
    pronoun: "his",
    source: "assets/characters/source/davi.png",
    original: "a red t-shirt with a small grey chest pocket and grey sleeve trims, mustard yellow shorts, white socks, brown sneakers",
    hair: { loiro: "golden blond", preto: "jet black", azul: "bright playful blue" },
  },
  lia: {
    who: "girl with long wavy red hair and green eyes",
    hairNow: "long wavy red",
    pronoun: "her",
    source: "assets/characters/source/lia.png",
    original: "a mustard yellow short overall with a front pocket and a grey drawstring, a brown t-shirt underneath, white socks, pink sneakers",
    hair: { castanho: "chestnut brown", loiro: "golden blond", rosa: "bright playful pink" },
  },
  theo: {
    who: "boy with straight black hair",
    hairNow: "straight black",
    pronoun: "his",
    source: "assets/characters/source/theo.png",
    original: "a yellow t-shirt, denim shorts, grey socks, green sneakers",
    hair: { castanho: "chestnut brown", loiro: "golden blond", azul: "bright playful blue" },
  },
};

const LOOKS = {
  esporte: () => "a sky blue t-shirt, denim shorts, white socks, bright red sneakers, and a teal baseball cap worn forward",
  moletom: () => "a cozy teal (#4ECDC4) hoodie, light grey jogger pants, white sneakers",
  culto: (c) =>
    c === "lia"
      ? "a pretty light blue sundress with small white flowers, white sandals, a small white hair clip"
      : "a neat light blue polo shirt tucked into beige chino pants, a brown belt, brown loafers",
  explorador: (c) =>
    `a khaki explorer shirt with pockets, olive cargo shorts, a red neckerchief scarf, a brown backpack on ${CHARACTERS[c].pronoun} shoulders, brown hiking boots`,
  tunica: (c) =>
    c === "lia"
      ? "an ancient biblical era long dress in soft teal, a light cream headscarf loosely covering part of her hair, a brown cloth belt and simple leather sandals"
      : "an ancient biblical era tunic in warm mustard yellow down to the knees, tied at the waist with a brown cloth belt, a small leather shoulder bag strap across the chest, and simple brown leather sandals",
  pastor: (c) =>
    `an ancient biblical shepherd outfit: a cream wool tunic with a brown striped cloak, a cloth headband, leather sandals, holding a wooden shepherd's staff in one hand and a small fluffy white lamb held in ${CHARACTERS[c].pronoun} other arm`,
  realeza: (c) =>
    c === "lia"
      ? "a biblical young queen outfit like queen Esther: a royal purple and gold gown, a small golden tiara, gold bracelets, sandals"
      : "a biblical young king outfit: a rich royal purple robe with gold trim over a cream tunic, a small golden crown, a gold belt, leather sandals",
};

const HAIR_LOOKS = ["original", "esporte"];

const keep = (c) =>
  `Keep the exact same ${CHARACTERS[c].who}: same face, skin tone, eyes, hairstyle, body proportions, pose, camera framing and 3D animated movie style as the reference. Full body, centered, plain background, soft studio lighting, no text.`;

const ACCESSORY_STYLE =
  "Set of 6 separate accessory items for a 3D animated movie character (Pixar-like soft 3D render), arranged in a clean 3 by 2 grid with generous empty space between them, each item centered in its own cell, shown straight from the front, no people, no characters, no text. Plain background, soft studio lighting. Items: ";

// ---------------- jobs ----------------
function buildJobs(manifest) {
  const jobs = [];
  for (const c of Object.keys(CHARACTERS)) {
    jobs.push({
      key: `${c}/original`,
      parent: null,
      reference: CHARACTERS[c].source,
      prompt: `The same ${CHARACTERS[c].who} from the reference image. ${keep(c)} Standing straight facing the viewer in a relaxed friendly pose, arms slightly away from the body, feet visible, gentle smile. Same outfit: ${CHARACTERS[c].original}.`,
    });
    for (const [look, outfit] of Object.entries(LOOKS)) {
      jobs.push({ key: `${c}/${look}`, parent: `${c}/original`, prompt: `${keep(c)} Only change the clothes. Outfit: ${outfit(c)}.` });
    }
    for (const look of HAIR_LOOKS) {
      for (const [name, color] of Object.entries(CHARACTERS[c].hair)) {
        jobs.push({
          key: `${c}/${look}-cabelo-${name}`,
          parent: `${c}/${look}`,
          prompt: `Keep everything identical to the reference: same face, outfit, pose, camera framing and 3D animated movie style. Only change the hair color from ${CHARACTERS[c].hairNow} to ${color}, keeping exactly the same hairstyle and shape. Full body, centered, plain background, no text.`,
        });
      }
    }
  }
  jobs.push({
    key: "acessorios/folha-1",
    sheet: true,
    prompt: ACCESSORY_STYLE + "1) a teal baseball cap, 2) a straw sun hat, 3) cool round sunglasses, 4) over-ear headphones in teal, 5) a crown of small colorful flowers, 6) a soft pink hair headband",
  });
  jobs.push({
    key: "acessorios/folha-2",
    sheet: true,
    prompt: ACCESSORY_STYLE + "1) a red neck scarf tied in a knot, 2) a small brown leather backpack, 3) a wooden shepherd's staff with a curved top, 4) a small golden harp, 5) a small brown pocket bible with a gold cross, 6) a red balloon on a white string",
  });
  // Already generated in the pilot
  for (const [key, taskId] of Object.entries({
    "theo/original": "01a1ecdc-ceb1-7697-96b9-640ecb616ec2",
    "theo/tunica": "01a1ecdd-774c-726c-adfa-186e899e2809",
    "theo/esporte": "01a1ecdd-80bc-73fe-ab5d-310dd694fefa",
  })) {
    if (!manifest[key]) manifest[key] = { taskId, status: "SUBMITTED", pilot: true };
  }
  return jobs;
}

// ---------------- meshy helpers ----------------
function meshy(args) {
  const out = execFileSync(process.execPath, [MESHY, ...args, "--format", "json", "--no-update-check"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 20 * 1024 * 1024,
  });
  return JSON.parse(out);
}

function submit(job, manifest) {
  const args = job.sheet
    ? ["text-to-image", "create", "--ai-model", "gpt-image-2-5-flare", "--aspect-ratio", "3:2", "--remove-background", "true", "--async", "--prompt", job.prompt]
    : [
        "image-to-image",
        "create",
        "--ai-model",
        "gpt-image-2-5-flare",
        "--aspect-ratio",
        "2:3",
        "--remove-background",
        "true",
        "--async",
        ...(job.parent ? ["--input-task-id", manifest[job.parent].taskId] : ["--reference-image-urls", job.reference]),
        "--prompt",
        job.prompt,
      ];
  if (DRY) {
    console.log("[dry]", job.key, "<-", job.parent ?? job.reference ?? "text");
    return;
  }
  const r = meshy(args);
  if (!r.ok) throw new Error(`${job.key}: ${JSON.stringify(r.error)}`);
  manifest[job.key] = { taskId: r.result.submission.task_id, parent: job.parent, status: "SUBMITTED", resource: job.sheet ? "text-to-image" : "image-to-image" };
  console.log("submitted", job.key, manifest[job.key].taskId);
}

function finish(key, manifest) {
  const entry = manifest[key];
  const resource = entry.resource ?? "image-to-image";
  meshy([resource, "wait", entry.taskId, "--timeout", "500"]);
  const task = meshy([resource, "get", entry.taskId]).result.task;
  entry.status = task.status;
  entry.credits = task.consumed_credits ?? null;
  if (task.status !== "SUCCEEDED") {
    console.log("FAILED", key, task.task_error ? JSON.stringify(task.task_error) : "");
    return;
  }
  const dir = path.join(RAW, key.replace("/", "_"));
  meshy(["download", "--resource", resource, "--task-id", entry.taskId, "--kind", "image", "--output-dir", dir, "--workspace", path.join(ROOT, "assets/models")]);
  const target = path.join(OUT, `${key}.png`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(dir, "image_0.png"), target);
  entry.file = path.relative(ROOT, target).replaceAll("\\", "/");
  console.log("done", key, `${entry.credits} cr`);
}

// ---------------- main ----------------
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
const save = () => fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
const jobs = buildJobs(manifest);

for (let wave = 1; wave <= 8; wave += 1) {
  const ready = jobs.filter(
    (j) =>
      (!manifest[j.key] || manifest[j.key].status === "FAILED") &&
      (!j.parent || manifest[j.parent]?.status === "SUCCEEDED" || manifest[j.parent]?.status === "SUBMITTED")
  );
  // A job whose parent is still only SUBMITTED must wait: finish pending ones first
  const pending = Object.keys(manifest).filter((k) => manifest[k].status === "SUBMITTED");
  for (const key of pending) {
    if (!DRY) finish(key, manifest);
    save();
  }
  const runnable = ready.filter((j) => !j.parent || manifest[j.parent]?.status === "SUCCEEDED");
  if (runnable.length === 0 && pending.length === 0) break;
  console.log(`--- wave ${wave}: ${runnable.length} jobs`);
  for (const job of runnable) {
    try {
      submit(job, manifest);
    } catch (error) {
      console.log("SUBMIT ERROR", job.key, error.message);
    }
    save();
  }
  if (DRY) break;
}

const done = Object.values(manifest).filter((e) => e.status === "SUCCEEDED");
const credits = done.reduce((sum, e) => sum + (e.credits ?? 0), 0);
console.log(`\n${done.length} figurinhas prontas, ${credits} créditos nesta lista`);
