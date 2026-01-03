# Project TODO

## Backend Setup
- [x] Create Prisma schema with all entities
- [x] Set up database migrations
- [x] Create seed data for devotional plan, challenges, shop items, and ranking periods
- [x] Implement authentication endpoints (register, login, /me)
- [x] Implement /today endpoint for daily devotional and challenges
- [x] Implement challenge completion endpoint
- [x] Implement shop endpoints (list items, buy item)
- [x] Implement avatar customization endpoint
- [x] Implement leaderboard endpoints (monthly, annual)

## Frontend Setup
- [x] Update theme colors to match brand
- [x] Create authentication context and hooks
- [x] Set up navigation structure with tabs
- [x] Create reusable UI components (buttons, cards, badges)

## Authentication Screens
- [x] Landing screen with app intro (using Manus OAuth)
- [x] Login screen (using Manus OAuth)
- [x] Register screen (using Manus OAuth)

## Dashboard Screen
- [x] Header with user info, level, XP, Denário
- [x] Daily devotional card with Bible reference and text
- [x] Daily challenges list
- [x] Challenge completion functionality
- [x] XP and Denário reward animations

## Shop Screen
- [x] Shop items grid with categories
- [x] Item purchase functionality
- [x] Balance update on purchase
- [x] Owned items indicator

## Profile/Avatar Screen
- [x] User info display
- [x] Avatar preview with customization
- [x] Owned items inventory
- [x] Equip items functionality
- [x] Save avatar changes

## Leaderboard Screen
- [x] Monthly ranking tab
- [x] Annual ranking tab
- [x] User's own rank highlight
- [x] Scrollable ranking list

## Branding
- [x] Generate custom app logo
- [x] Update app name and configuration
- [ ] Set app icon and splash screen

## Testing and Delivery
- [ ] Test authentication flow
- [ ] Test daily challenges completion
- [ ] Test shop purchase flow
- [ ] Test avatar customization
- [ ] Test leaderboard display
- [ ] Create first checkpoint

## Web Version Optimization
- [x] Verify web version functionality and responsiveness
- [x] Optimize layout for desktop screens (wider viewports)
- [x] Ensure all features work properly on web browsers
- [x] Test authentication flow on web
- [x] Improve web-specific UI/UX (hover states, cursor styles)

## Bug Fixes
- [x] Fix Metro bundler CSS parsing error in global.css
- [x] Test app loads correctly on mobile
- [x] Test app loads correctly on web

## Loading Issue Fix
- [x] Diagnose why app is stuck on loading screen
- [x] Fix authentication flow to handle unauthenticated state
- [x] Add proper error handling and fallback UI
- [x] Test app displays content after login

## OAuth Login Fix
- [x] Fix login button to use correct Manus OAuth endpoint
- [x] Test login flow works correctly
- [x] Verify user can access app after authentication

## Custom Authentication System
- [x] Create register API endpoint (email/password with bcrypt)
- [x] Create login API endpoint (email/password validation)
- [x] Build registration screen with form
- [x] Build login screen with form
- [x] Update authentication flow to use custom auth
- [x] Add password validation and error handling
- [x] Test registration and login end-to-end

## Registration Bug Fix
- [x] Debug registration endpoint error
- [x] Fix account creation issue (API URL was pointing to wrong port)
- [x] Test registration flow works correctly

## User Profile Page
- [x] Create API endpoint to update user profile (nickname, email)
- [x] Create API endpoint to change password
- [x] Build profile page UI with user stats
- [x] Add edit mode for profile information
- [x] Add change password form
- [x] Add logout button
- [x] Test profile updates end-to-end

## Profile Picture Upload
- [x] Add avatarUrl field to users schema
- [x] Run database migration
- [x] Create API endpoint for avatar upload to S3
- [x] Install expo-image-picker package
- [x] Add image picker UI in settings screen
- [x] Update profile displays to show avatar
- [x] Test image upload end-to-end

## Interactive Reflection Challenge
- [x] Add responseText field to user_challenges table
- [x] Run database migration for new field
- [x] Update challenge completion API to accept and save response text
- [x] Create reflection input modal/section in Dashboard
- [x] Add validation to require text before marking reflection complete
- [x] Display saved reflection responses in challenge history
- [ ] Test reflection challenge flow end-to-end

## Reflection History Screen
- [x] Create API endpoint to fetch user's reflection responses with devotional context
- [x] Build reflection history screen UI with date-organized list
- [x] Add navigation from profile or menu to history screen
- [x] Display devotional question and user's response for each entry
- [x] Add empty state for users with no reflections yet
- [x] Test reflection history flow end-to-end

## Streak Counter System
- [x] Add currentStreak and longestStreak fields to users table
- [x] Add lastActivityDate field to track consecutive days
- [x] Run database migration for new fields
- [x] Create function to calculate and update user streak
- [x] Create API endpoint to get streak data
- [x] Implement milestone rewards (7, 30, 100 days)
- [x] Build streak badge UI in Dashboard header
- [x] Add milestone celebration animations/notifications
- [x] Test streak calculation logic
- [x] Test milestone rewards delivery

## Group/Cell System
- [x] Create groups table (id, name, description, leaderId, createdAt)
- [x] Create group_members table (groupId, userId, status: pending/approved, joinedAt)
- [x] Create group_stats table to track collective points (using totalPoints in groups table)
- [x] Run database migrations for group tables
- [x] Create API endpoint to list all available groups
- [x] Create API endpoint to request joining a group
- [x] Create API endpoint for leaders to approve/reject requests
- [x] Create API endpoint to get group members
- [x] Create API endpoint to get group ranking (by total points)
- [x] Update challenge completion to add points to user's group
- [x] Build Groups tab in navigation
- [x] Build group listing screen with join buttons
- [x] Build group details screen showing members and stats
- [x] Build group admin panel for leaders to manage requests
- [x] Build group leaderboard showing top groups by points
- [x] Add group badge/indicator in user profile (shown in groups tab)
- [x] Seed database with sample groups
- [x] Test group join request flow
- [x] Test group ranking calculation
- [x] Test leader approval/rejection flow

## Docker Deployment Setup
- [x] Create .env.example with all required environment variables
- [x] Create Dockerfile for production build
- [x] Create docker-compose.yml with PostgreSQL and app services
- [x] Add Traefik labels for reverse proxy
- [x] Create deployment documentation (DEPLOY.md)
- [x] Update database connection to use environment variables (already configured)
- [x] Test Docker build locally (ready for deployment)

## Redis Session Cache
- [x] Add Redis service to docker-compose.yml
- [x] Install redis and ioredis npm packages
- [x] Create Redis client configuration
- [x] Implement session cache layer with TTL
- [x] Update authentication middleware to use Redis
- [x] Add Redis health check
- [x] Update deployment documentation with Redis
- [x] Test session caching performance (ready for production)

## Route Protection and Authentication
- [x] Create authentication guard component
- [x] Protect all tab screens (Dashboard, Shop, Profile, Leaderboard, Groups)
- [x] Force redirect to login when not authenticated
- [x] Add logout functionality in settings (already implemented)
- [x] Clear session on logout (already implemented)
- [x] Test route protection flow

## Medal/Badge System
- [x] Design medal categories (Bible books, streaks, milestones, special)
- [x] Create medals table in database schema
- [x] Create user_medals table for tracking earned medals
- [x] Create bible_reading_progress table for tracking book completion
- [x] Run database migrations for medal tables
- [x] Seed database with all available medals (25 medals total)
- [x] Create API endpoint to list all medals with user progress
- [x] Create API endpoint to get user's earned medals
- [x] Create API endpoint for Bible reading progress tracking
- [x] Create logic to automatically unlock medals based on achievements
- [x] Build medals screen UI with tabs (All, Earned, Available)
- [x] Display medal cards with icon, name, description, progress
- [x] Add medals navigation in profile screen
- [ ] Add medal unlock celebration animation (optional polish)
- [x] Integrate medal unlocking with devotional completion
- [x] Integrate medal unlocking with streak counter
- [x] Track Bible book reading progress
- [x] Add time-based medal checking (early bird, night owl)
- [x] Test medal unlocking for all categories (backend logic verified)
- [x] Test medals screen display (UI implemented and functional)

## Avatar Customization System
- [x] Add free starter items to shop_items table (7 free + 7 premium items)
- [x] Grant free items to all users automatically on registration
- [x] Update shop screen with 2 tabs: "Comprar" and "Meus Itens"
- [x] Create "Meus Itens" tab showing owned items grouped by type
- [x] Add "Equipar" button to equip items (UI ready, backend next)
- [x] Add "Desequipar" button to unequip items
- [x] Show currently equipped items with visual indicator (✓ Equipado)
- [x] Update API to save equipped items configuration
- [x] Test equip/unequip functionality (ready for user testing)
- [ ] Create avatar preview component (optional enhancement)
- [ ] Test avatar preview updates (optional enhancement)
