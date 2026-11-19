/**
 * Generates "accessory poses" with Meshy (image-to-image): the character redrawn WITH the
 * accessory — playing the harp, gripping the staff, the cap really on the head (hair under
 * it) — instead of an overlay. Starts from the figurine already on Meshy (its task id in
 * assets/characters/manifest.json), so face/style stay the same.
 *
 * Every job is recorded in the same manifest under "poses/<character>-<look>-<accessory>",
 * so re-running is safe: finished jobs are skipped, failed ones retried.
 *
 * Usage:
 *   node scripts/generate-accessory-poses.mjs --only lia-original-harpa,theo-original-bone
 *   node scripts/generate-accessory-poses.mjs --dry-run          (list jobs, spend nothing)
 * 12 credits per image. After generating: python scripts/clean-figurine-alpha.py on the new
 * PNGs, then export 512x768 WebP to public/characters/poses/ and list the accessory in
 * POSE_ACCESSORIES (shared/character-catalog.ts) so the app uses the pose instead of the overlay.
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
const onlyArg = process.argv.find((a) => a.startsWith("--only"));
const ONLY = onlyArg ? (onlyArg.includes("=") ? onlyArg.split("=")[1] : process.argv[process.argv.indexOf(onlyArg) + 1]).split(",") : null;

const WHO = {
  davi: { who: "boy with short curly brown hair and thick black square glasses", hair: "curly brown hair", p: "his", s: "he" },
  lia: { who: "girl with long wavy red hair and green eyes", hair: "long wavy red hair", p: "her", s: "she" },
  theo: { who: "boy with straight black hair", hair: "straight black hair", p: "his", s: "he" },
};

const keep = (c) =>
  `Keep the exact same ${WHO[c].who}: same face, skin tone, eyes, hairstyle, outfit, body proportions, camera framing and 3D animated movie style as the reference. Full body standing, feet visible, centered, plain background, soft studio lighting, no text.`;

/** What changes for each accessory (pose and how it is worn/held). */
const POSES = {
  harpa: (c) =>
    `Change only the pose: ${WHO[c].s} is happily PLAYING a small golden harp (a lyre-shaped harp like King David's, about the size of ${WHO[c].p} torso, golden frame with several strings). ${WHO[c].s} holds the harp upright against ${WHO[c].p} chest with one arm wrapped around its frame, and the fingers of ${WHO[c].p} other hand are plucking the strings, looking at the viewer with a gentle joyful smile.`,
  bone: (c) =>
    `Only add a plain teal (#3AA6A8) baseball cap worn forward, sitting properly on ${WHO[c].p} head at the right size for ${WHO[c].p} head. ${WHO[c].p[0].toUpperCase() + WHO[c].p.slice(1)} ${WHO[c].hair} is tucked under the cap and only shows naturally at the sides and back, the way real hair looks under a cap. Same pose.`,
  cajado: (c) =>
    `Change only the pose: ${WHO[c].s} firmly holds a tall wooden shepherd's staff with a curved hook on top, gripping it with one hand at chest height, the bottom of the staff resting on the ground beside ${WHO[c].p} feet.`,
  balao: (c) =>
    `Change only the pose: ${WHO[c].s} holds the white string of a shiny red balloon in one raised hand, the balloon floating above and to the side of ${WHO[c].p} head.`,
  biblia: (c) =>
    `Change only the pose: ${WHO[c].s} holds a small brown pocket Bible with a gold cross on the cover with both hands in front of ${WHO[c].p} chest, cover facing the viewer.`,
};

function jobs() {
  const list = [];
  for (const c of Object.keys(WHO)) {
    for (const [acc, pose] of Object.entries(POSES)) {
      const look = "original";
      list.push({ id: `${c}-${look}-${acc}`, key: `poses/${c}-${look}-${acc}`, parent: `${c}/${look}`, prompt: `${keep(c)} ${pose(c)}` });
    }
  }
  return ONLY ? list.filter((j) => ONLY.includes(j.id)) : list;
}

function meshy(args) {
  const out = execFileSync(process.execPath, [MESHY, ...args, "--format", "json", "--no-update-check"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 20 * 1024 * 1024,
  });
  return JSON.parse(out);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const todo = jobs().filter((j) => manifest[j.key]?.status !== "SUCCEEDED");
console.log(`${todo.length} job(s):`, todo.map((j) => j.id).join(", ") || "-");
if (DRY) {
  for (const j of todo) console.log(`\n[${j.id}] <- ${j.parent}\n${j.prompt}`);
  process.exit(0);
}

for (const job of todo) {
  // Already submitted (e.g. the run was interrupted): reuse it, never pay twice
  if (manifest[job.key]?.status === "SUBMITTED" && manifest[job.key].taskId) {
    console.log("resuming", job.id, manifest[job.key].taskId);
    continue;
  }
  const parent = manifest[job.parent];
  if (!parent?.taskId) throw new Error(`${job.id}: parent ${job.parent} not in manifest`);
  const r = meshy([
    "image-to-image", "create",
    "--ai-model", "gpt-image-2-5-flare",
    "--aspect-ratio", "2:3",
    "--remove-background", "true",
    "--async",
    "--input-task-id", parent.taskId,
    "--prompt", job.prompt,
  ]);
  if (!r.ok) throw new Error(`${job.id}: ${JSON.stringify(r.error)}`);
  manifest[job.key] = { taskId: r.result.submission.task_id, parent: job.parent, status: "SUBMITTED", resource: "image-to-image" };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log("submitted", job.id, manifest[job.key].taskId);
}

let credits = 0;
for (const job of todo) {
  const entry = manifest[job.key];
  meshy(["image-to-image", "wait", entry.taskId, "--timeout", "500"]);
  const task = meshy(["image-to-image", "get", entry.taskId]).result.task;
  entry.status = task.status;
  entry.credits = task.consumed_credits ?? null;
  credits += entry.credits ?? 0;
  if (task.status !== "SUCCEEDED") {
    console.log("FAILED", job.id, task.task_error ? JSON.stringify(task.task_error) : "");
    continue;
  }
  const dir = path.join(RAW, job.key.replace("/", "_"));
  meshy(["download", "--resource", "image-to-image", "--task-id", entry.taskId, "--kind", "image", "--output-dir", dir, "--workspace", path.join(ROOT, "assets/models")]);
  const target = path.join(OUT, `${job.key}.png`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(dir, "image_0.png"), target);
  entry.file = path.relative(ROOT, target).replaceAll("\\", "/");
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log("done", job.id, `${entry.credits} cr`, entry.file);
}
console.log(`\n${credits} créditos gastos`);
