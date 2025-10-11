# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foodies is a React Native mobile application built with Expo and Expo Router, designed for food ordering within organizations (e.g., universities, campuses). The app connects customers with approved vendors through their organization affiliation.

## Development Commands

### Starting the App
```bash
# Start the Expo development server
npm start
# or
expo start

# Platform-specific starts
npm run android    # Android
npm run ios        # iOS
npm run web        # Web
```

### Development Tools
```bash
npm run lint              # Run ESLint
npm run reset-project     # Reset to blank starter template
```

### Installing Dependencies
```bash
npm install
```

## Architecture Overview

### Technology Stack
- **Framework**: React Native (0.81.4) with Expo (~54.0.0)
- **Routing**: Expo Router (~6.0.10) with file-based routing
- **Backend**: Supabase (PostgreSQL database with real-time subscriptions)
- **Language**: TypeScript (~5.9.2)
- **Styling**: StyleSheet API (React Native) - separated into `styles/` directory

### Routing Structure

The app uses Expo Router with file-based routing:

- `/app/(tabs)/` - Main authenticated tab navigation
  - `home.tsx` - Organization selection screen
  - `cart.tsx` - Shopping cart with order placement
  - `messages.tsx` - Messages/notifications (placeholder)
  - `profile.tsx` - User profile (placeholder)
  - `_layout.tsx` - Tab navigator configuration

- `/app/auth/` - Authentication flows
  - `login.tsx` - Customer login with role validation
  - `signup.tsx` - Customer registration

- `/app/` - Top-level screens
  - `vendors.tsx` - Vendor list for selected organization
  - `vendor-menu.tsx` - Menu items for selected vendor
  - `intro.tsx` - Onboarding/intro screen
  - `_layout.tsx` - Root layout with providers

### Application Flow

1. **Authentication** → Users must log in as "customer" role (verified against Supabase `profiles` table)
2. **Organization Selection** (`home.tsx`) → Browse and select organization
3. **Vendor Selection** (`vendors.tsx`) → View approved vendors within that organization
4. **Menu Browsing** (`vendor-menu.tsx`) → View vendor menu items and add to cart
5. **Cart & Checkout** (`cart.tsx`) → Review cart, place orders (all items must be from same vendor)

### Context Providers & State Management

The app has a nested provider structure defined in `app/_layout.tsx`:

```
AuthProvider (from app/context/_authContext.tsx)
  └─ AuthGuard (from app/components/AuthGuard.tsx)
      └─ CartProvider (from app/context/_CartContext.tsx)
          └─ App Routes
```

**AuthProvider** (`contexts/authContext.tsx`):
- Manages Supabase auth session state
- Provides `user`, `loading`, and `signOut` via `useAuth()` hook
- Listens for auth state changes via `supabase.auth.onAuthStateChange`

**CartProvider** (`contexts/CartContext.tsx`):
- Manages shopping cart state (in-memory, not persisted)
- Key functions:
  - `addToCart(item, quantity)` - Add/increment items
  - `incrementQuantity(id)` - Increase quantity by 1
  - `removeFromCart(id)` - Decrease quantity by 1 (removes if reaches 0)
  - `clearCart()` - Empty cart
  - `placeOrder(userId)` - Insert order into Supabase `orders` table
- Validates that all cart items are from the same vendor before order placement

**AuthGuard** (`app/components/AuthGuard.tsx`):
- Redirects unauthenticated users to `/auth/login`
- Shows loading spinner while checking auth state
- Allows access to `/auth/*` routes without authentication

### Supabase Integration

**Connection** (`supabase.js`):
- Supabase client initialized with public URL and anon key
- **Note**: Credentials are currently exposed in source code (should move to environment variables)

**Database Schema**:

**`profiles`** - User profiles for all roles
- `id` (UUID, PK, references auth.users)
- `role` (text) - One of: "customer", "vendor", "deliverer", "admin", "superadmin"
- `full_name` (text)
- `email` (text, validated)
- `organization` (text, default: "global")
- `phone` (text)
- `status` (text, default: "pending") - One of: "pending", "approved", "declined"
- `created_at`, `updated_at` (timestamptz)

**`vendors`** - Extended vendor information (id references profiles)
- `id` (UUID, PK, FK to profiles.id)
- `business_name` (text, required)
- `business_address` (text)
- `menu_summary` (text)
- `is_active` (boolean, default: true)
- `created_at`, `updated_at` (timestamptz)

**`categories`** - Menu categories per vendor
- `id` (UUID, PK)
- `vendor_id` (UUID, FK to vendors.id)
- `name` (text, required)
- `display_order` (integer, default: 0)
- `is_active` (boolean, default: true)
- `created_at`, `updated_at` (timestamptz)

**`menu_items`** - Menu items with optional categorization
- `id` (UUID, PK)
- `vendor_id` (UUID, FK to vendors.id)
- `category_id` (UUID, nullable, FK to categories.id)
- `name` (text, required)
- `description` (text)
- `price` (numeric, >= 0)
- `image_url` (text)
- `is_available` (boolean, default: true)
- `created_at`, `updated_at` (timestamptz)

**`orders`** - Customer orders with lifecycle tracking
- `id` (UUID, PK)
- `customer_id` (UUID, FK to profiles.id)
- `vendor_id` (UUID, FK to vendors.id)
- `deliverer_id` (UUID, nullable, FK to profiles.id)
- `items` (jsonb) - Array of cart items
- `total_price` (numeric, >= 0)
- `status` (text, default: "pending") - One of: "pending", "preparing", "ready", "accepted", "on_the_way", "delivered", "completed", "cancelled"
- `delivery_address` (text)
- `delivery_notes` (text)
- `customer_name` (text)
- `customer_phone` (text)
- `created_at`, `prepared_at`, `accepted_at`, `delivered_at`, `completed_at` (timestamptz)

**`applications`** - Role applications/requests
- `id` (UUID, PK)
- `user_id` (UUID, FK to auth.users)
- `full_name` (text, required)
- `email` (text, required, validated)
- `role` (text, required) - One of: "vendor", "deliverer", "admin"
- `status` (text, default: "pending") - One of: "pending", "approved", "declined"
- `organization` (text)
- `notes` (text)
- `document_urls` (jsonb, default: [])
- `business_name`, `business_address`, `menu_summary` (text) - For vendor applications
- `vehicle_type`, `availability` (text) - For deliverer applications
- `created_at`, `reviewed_at` (timestamptz)
- `reviewed_by` (UUID, FK to profiles.id)

**Key Schema Relationships**:
- `vendors` table has same `id` as `profiles` (1-to-1 extension for vendor role)
- `menu_items` can optionally be organized into `categories`, both linked to `vendors`
- `orders` link customers, vendors, and optionally deliverers (all from `profiles`)
- Order lifecycle tracked through status field and multiple timestamp fields
- `applications` table handles role requests before profiles are approved

**Important Schema Notes**:
- The app currently queries `profiles` table directly for vendor information, but should query the `vendors` table for complete vendor data
- `categories` table exists but may not be fully utilized in current UI
- Order status transitions: pending → preparing → ready → accepted → on_the_way → delivered → completed (or cancelled at any point)

### Path Aliases

TypeScript is configured with path alias `@/*` mapping to the root directory. However, imports in the codebase use relative paths (`../` style) rather than aliases.

### Project Structure

```
app/
├── (tabs)/              # Tab navigation screens
│   ├── cart.tsx         # Shopping cart and checkout
│   ├── home.tsx         # Organization selection
│   ├── messages.tsx     # Messages (placeholder)
│   ├── profile.tsx      # Profile (placeholder)
│   └── _layout.tsx      # Tab navigator config
├── auth/                # Authentication screens
│   ├── login.tsx        # Customer login
│   └── signup.tsx       # Customer registration
├── components/          # Shared components
│   └── AuthGuard.tsx    # Route protection
├── context/             # Context providers
│   ├── _authContext.tsx # Auth state management
│   └── _CartContext.tsx # Cart state management
├── vendor-menu.tsx      # Vendor menu items screen
├── vendors.tsx          # Vendor list screen
└── _layout.tsx          # Root layout

styles/
└── screens/             # StyleSheet definitions for each screen
    ├── cartStyles.ts
    ├── homeStyles.ts
    ├── loginStyles.ts
    ├── signupStyles.ts
    ├── vendorMenuStyles.ts
    └── vendorsStyles.ts

constants/               # Color themes and constants
hooks/                   # Custom React hooks (useColorScheme, useThemeColor)
assets/                  # Images and fonts
```

### UI Patterns

- **Color Scheme**: Blue primary (`#4A5EE8`), with light/dark mode support via `Colors.ts` constant
- **Theme Support**: `useColorScheme` hook for light/dark mode detection
- **Layout Pattern**: Many screens use a blue header section with white rounded content area below
- **Icons**: Uses `@expo/vector-icons` (Ionicons)
- **Styling Organization**: All StyleSheet definitions extracted to `styles/screens/` directory

## Important Implementation Details

### Authentication Flow
- Login validates user role is "customer" from `profiles` table
- Non-customer roles are rejected with error message
- Session managed automatically by Supabase auth listener
- On successful login, redirects to `/(tabs)/home`

### Cart Business Logic
- Cart enforces single-vendor constraint (checked in `placeOrder`)
- Quantity management: `addToCart` sets initial quantity, `incrementQuantity`/`removeFromCart` adjust by ±1
- Cart state is NOT persisted (resets on app restart)
- Orders saved to Supabase with status "Pending"

### Data Fetching Patterns
- Most screens use `useEffect` + `useState` for data fetching from Supabase
- Loading states managed with boolean flags
- Error handling via console.error (limited user feedback)

### Navigation
- Uses `useRouter()` from expo-router
- Route params passed via object: `router.push({ pathname: "/vendors", params: { orgName } })`
- Back navigation: `router.back()` or `router.replace()`

## Common Development Tasks

### Adding a New Screen
1. Create `.tsx` file in appropriate `app/` subdirectory
2. Export default React component
3. File name becomes route (e.g., `app/orders.tsx` → `/orders`)
4. For nested routes, use folders with `_layout.tsx`

### Adding a New Database Query
1. Import `supabase` from `../supabase` (adjust path as needed)
2. Use Supabase query builder: `supabase.from('table').select().eq('col', val)`
3. Handle `{ data, error }` response pattern
4. Add loading/error states to UI

### Modifying Cart Logic
- Cart context is in `contexts/CartContext.tsx`
- Cart UI is in `app/(tabs)/cart.tsx`
- Order placement logic in `placeOrder` function of CartContext

### Working with Authentication
- Auth context: `contexts/authContext.tsx`
- Login screen: `app/auth/login.tsx`
- Signup screen: `app/auth/signup.tsx`
- Auth guard: `app/components/AuthGuard.tsx`
- Use `const { user, loading, signOut } = useAuth()` in components

## Project-Specific Notes

- **User Roles**: App specifically designed for "customer" role; vendors, deliverers, and admins use different interfaces (not in this codebase)
  - Five roles exist: customer, vendor, deliverer, admin, superadmin
  - Role applications handled through `applications` table
  - Vendors have extended profile in `vendors` table with business details

- **Organization-Based Discovery**: Users find vendors through organization affiliation rather than geographic location
  - Organization defaults to "global" but typically set to specific institutions
  - Vendors are filtered by organization in queries

- **Single-Vendor Orders**: Business rule enforces one vendor per order (validated in CartContext)

- **Order Lifecycle**: Complex status workflow with 8 possible states
  - Customer app only creates orders with "pending" status
  - Other statuses handled by vendor/deliverer apps (not in this codebase)
  - Multiple timestamp fields track order progression

- **Menu Categories**: Database supports menu item categorization, but current UI implementation may not fully utilize this feature

- **Vendor Data Model Mismatch**:
  - Code queries `profiles` table for vendor info (using `vendor_name` field that doesn't exist in schema)
  - Should query `vendors` table which has proper `business_name` and `business_address`
  - `vendors.id` is same as `profiles.id` (1-to-1 relationship)

- **Duplicate Context Files**: Note there are duplicate context files in both `/contexts/` and `/app/context/` directories. The app uses the ones in `/app/context/` (with underscore prefix in filenames)

## Known Issues & Technical Debt

- **Schema Mismatch**: Code references non-existent `vendor_name` field in `profiles` table
  - Queries should use `vendors` table and `business_name` field instead
  - Affects `app/vendors.tsx` and related vendor display logic

- **Categories Not Utilized**: Database has `categories` table but UI doesn't fully implement category-based menu organization

- **Supabase credentials hardcoded** in `supabase.js` (should use environment variables)

- **Limited error handling**/user feedback on API failures (mostly console.error)

- **Cart state not persisted** (lost on app restart, no localStorage/AsyncStorage)

- **Placeholder screens** exist for messages and profile features

- **Type definitions use `any`** in several places (e.g., user state in AuthContext)

- **Order status management**: Customer app only creates "pending" orders; no UI for viewing order status updates
