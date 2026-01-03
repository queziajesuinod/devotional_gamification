# Devotional Gamification Mobile App - Design Document

## Design Philosophy

This mobile app is designed for **teenagers aged 10-14** using **mobile portrait orientation (9:16)** with **one-handed usage** in mind. The design follows **Apple Human Interface Guidelines (HIG)** to feel like a first-party iOS app, with mainstream iOS mobile app design standards.

## Screen List

### 1. **Landing Screen** (`/`)
- Simple welcome screen with app logo and tagline
- "Começar" (Get Started) button leading to login/register

### 2. **Login Screen** (`/login`)
- Email input field
- Password input field
- "Entrar" (Login) button
- "Criar conta" (Create account) link to register screen

### 3. **Register Screen** (`/register`)
- Name input field
- Nickname input field
- Email input field
- Password input field
- Confirm password input field
- "Criar conta" (Create account) button
- "Já tem conta? Entrar" (Already have account? Login) link

### 4. **Dashboard Screen** (`/app/dashboard`) - Main Tab
- **Header Section:**
  - User avatar (small, top-left)
  - User nickname
  - Level badge
  - XP progress bar
  - Denário balance (coin icon + number)
  
- **Daily Devotional Card:**
  - Date (e.g., "31 de Dezembro, 2025")
  - Bible reference (e.g., "Mateus 5:1-26")
  - Devotional text (scrollable if long)
  - Reflection question
  
- **Daily Challenges Section:**
  - List of 3-4 challenge cards:
    - Challenge title
    - Challenge description
    - XP reward badge
    - Denário reward badge
    - Status indicator (pending/completed)
    - "Concluir" (Complete) button (disabled if completed)

### 5. **Shop Screen** (`/app/shop`) - Tab
- **Header:**
  - Denário balance (prominent display)
  
- **Shop Items Grid:**
  - Category tabs: "Todos", "Fundos", "Roupas", "Acessórios"
  - Item cards in grid layout (2 columns):
    - Item preview image
    - Item name
    - Rarity badge (Common/Rare/Epic)
    - Price in Denários
    - "Comprar" (Buy) button (disabled if insufficient balance or already owned)

### 6. **Profile/Avatar Screen** (`/app/profile`) - Tab
- **Avatar Preview Section:**
  - Large avatar display
  - Current equipped items visible
  
- **User Info:**
  - Name and nickname
  - Email
  - Level and XP total
  - Denário balance
  
- **Avatar Customization:**
  - Gender/style selector
  - Hair style selector
  - Color pickers (hair, skin, etc.)
  
- **Owned Items Section:**
  - Tabs: "Fundos", "Roupas", "Acessórios"
  - Grid of owned items
  - "Equipar" (Equip) button on each item
  
- **Save Button:**
  - "Salvar Avatar" (Save Avatar) at bottom

### 7. **Leaderboard Screen** (`/app/leaderboard`) - Tab
- **Period Tabs:**
  - "Mensal" (Monthly)
  - "Anual" (Annual)
  
- **Ranking List:**
  - User's own rank highlighted at top (sticky)
  - Scrollable list of rankings:
    - Position number (with medal icons for top 3)
    - User avatar (small)
    - Nickname
    - Level badge
    - XP total for period

## Primary Content and Functionality

### Dashboard
- **Content:** Daily Bible reading reference, devotional text, reflection question, list of daily challenges
- **Functionality:** View daily content, complete challenges, earn XP and Denários, see immediate feedback on completion

### Shop
- **Content:** Grid of cosmetic items (backgrounds, clothes, accessories) with prices and rarity
- **Functionality:** Browse items by category, purchase items with Denários, see balance update in real-time

### Profile/Avatar
- **Content:** User information, large avatar preview, customization options, owned items inventory
- **Functionality:** Customize avatar appearance, equip owned items, save changes

### Leaderboard
- **Content:** Ranked list of users by XP for monthly and annual periods
- **Functionality:** View rankings, see own position, switch between monthly and annual views

## Key User Flows

### 1. **First Time User Flow**
1. User opens app → Landing screen
2. Tap "Começar" → Register screen
3. Fill in name, nickname, email, password → Tap "Criar conta"
4. Automatically logged in → Dashboard screen
5. See welcome message and first daily challenges

### 2. **Daily Devotional Flow**
1. User opens app → Dashboard (if logged in)
2. Read Bible reference and devotional text
3. Read reflection question
4. Tap "Concluir" on each challenge
5. See XP and Denário rewards animation
6. Progress bar updates
7. Challenge marked as completed

### 3. **Shop Purchase Flow**
1. User navigates to Shop tab
2. Browse items by category
3. Tap on item to see details
4. Tap "Comprar" button
5. Confirmation modal appears
6. Confirm purchase
7. Denário balance updates
8. Item added to owned items
9. Success message shown

### 4. **Avatar Customization Flow**
1. User navigates to Profile tab
2. Tap on avatar customization options
3. Change gender, hair, colors
4. Navigate to "Fundos" tab
5. Tap "Equipar" on owned background
6. See avatar preview update
7. Tap "Salvar Avatar"
8. Changes saved to server

### 5. **Leaderboard Flow**
1. User navigates to Leaderboard tab
2. See own rank at top (highlighted)
3. Scroll through rankings
4. Tap "Anual" tab to switch to annual rankings
5. See updated list

## Color Choices

### Brand Colors
- **Primary:** `#8B4513` (Saddle Brown - represents earthiness and spirituality)
- **Secondary:** `#FFD700` (Gold - represents Denário currency and rewards)
- **Accent:** `#4A90E2` (Sky Blue - represents hope and faith)

### UI Colors
- **Background (Light):** `#FFFFFF` (White)
- **Background (Dark):** `#1A1A1A` (Almost Black)
- **Surface (Light):** `#F5F5F5` (Light Gray)
- **Surface (Dark):** `#2A2A2A` (Dark Gray)
- **Foreground (Light):** `#11181C` (Almost Black)
- **Foreground (Dark):** `#ECEDEE` (Almost White)
- **Success:** `#22C55E` (Green - for completed challenges)
- **Warning:** `#F59E0B` (Amber)
- **Error:** `#EF4444` (Red)
- **Border (Light):** `#E5E7EB` (Light Gray)
- **Border (Dark):** `#334155` (Slate Gray)

### Gamification Colors
- **XP Bar:** `#4A90E2` (Sky Blue)
- **Denário:** `#FFD700` (Gold)
- **Common Rarity:** `#9CA3AF` (Gray)
- **Rare Rarity:** `#3B82F6` (Blue)
- **Epic Rarity:** `#A855F7` (Purple)

## Typography

- **Headers:** Bold, 24-32px
- **Body:** Regular, 16px
- **Small Text:** Regular, 14px
- **Buttons:** Semibold, 16px

## Navigation

Bottom tab bar with 4 tabs:
1. **Dashboard** (house icon)
2. **Shop** (shopping bag icon)
3. **Profile** (person icon)
4. **Leaderboard** (trophy icon)

## Design Principles

1. **Simplicity:** Clean, uncluttered interface suitable for 10-14 year olds
2. **Feedback:** Immediate visual feedback for all actions (animations, toasts)
3. **Gamification:** Visual rewards (XP bars, level badges, coin animations)
4. **Accessibility:** Large touch targets, readable fonts, high contrast
5. **Engagement:** Daily challenges create habit loop, shop creates long-term goals
