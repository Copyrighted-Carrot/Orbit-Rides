# Audit coverage — 28 October 2026

Baseline commit `877c140`: 164 tracked files. All authored application/library/schema/configuration source was reviewed across the three detailed audits; root configuration/README/license were checked separately. Existing AGENT_STATE.md and pasted instructions were also read. A source read is not runtime verification. The previous review is preserved, not accepted on trust.

Excluded from exhaustive reading: secret file values, Git binary objects, generated .next, node_modules, binary media payloads and third-party dependency source (apart from targeted probes). Lockfile and asset structure were inspected programmatically. No live policy export or authenticated full-journey test was obtained. All remaining runtime gates are explicit in SYSTEM_AUDIT.md and ROADMAP.md.

| Baseline path | Inspection method | Evidence area |
|---|---|---|
| `.eslintrc.json` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `.gitignore` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `LICENSE` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `README.md` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `app/(app)/HomePageFeaturedCarsCarousel.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/(app)/error.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/(app)/loading.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/(app)/page.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/(dashboard)/admin/(admin)/loading.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/(admin)/page.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/bookings/loading.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/bookings/page.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/CarCard.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/actions.ts` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/edit/[car_id]/EditCarPageContent.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/edit/[car_id]/error.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/edit/[car_id]/loading.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/edit/[car_id]/page.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/loading.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/new-car/NewCarPageContent.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/new-car/action.ts` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/new-car/error.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/new-car/loading.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/new-car/page.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/new-car/skeleton.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/new-car/upload_images/[car_id]/UploadNewCarImagesPageContent.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/new-car/upload_images/[car_id]/page.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/cars/page.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/admin/layout.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/booking/step1/BookingCarCardCarousel.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/booking/step1/BookingCarDetails.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/booking/step1/BookingMap.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/booking/step1/BookingStep1PageContent.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/booking/step1/action.ts` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/booking/step1/page.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/booking/step2/QRCheckoutContent.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/booking/step2/action.ts` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/booking/step2/page.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/booking/step3/DownloadButton.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/booking/step3/error.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/booking/step3/page.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/bookings/page.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/(dashboard)/customer/cars/CarCard.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/(dashboard)/customer/cars/CarFilters.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/(dashboard)/customer/cars/FeaturedCarCard.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/(dashboard)/customer/cars/error.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/(dashboard)/customer/cars/loading.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/(dashboard)/customer/cars/page.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/(dashboard)/customer/layout.tsx` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `app/(dashboard)/customer/profile/error.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/(dashboard)/customer/profile/loading.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/(dashboard)/customer/profile/page.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/(dashboard)/customer/settings/SettingsPageContent.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/(dashboard)/customer/settings/actions.ts` | Source/config/document read | [Evidence](security-schema.md) |
| `app/(dashboard)/customer/settings/error.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/(dashboard)/customer/settings/loading.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/(dashboard)/customer/settings/page.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/ToastContainer.tsx` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `app/api/ai/trip-planner/route.ts` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/api/payment/[session_id]/status/route.ts` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/auth/(forms)/admin/login/page.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/auth/(forms)/admin/signup-with-email/page.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/auth/(forms)/admin/signup/page.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/auth/(forms)/customer/login/page.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/auth/(forms)/customer/signup-with-email/page.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/auth/(forms)/customer/signup/page.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/auth/(forms)/layout.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/auth/assign-user-role/[role]/AssignRolePage.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/auth/assign-user-role/[role]/page.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/auth/loginActions.ts` | Source/config/document read | [Evidence](security-schema.md) |
| `app/auth/signupActions.ts` | Source/config/document read | [Evidence](security-schema.md) |
| `app/components/AdminAnalyticsCharts.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/AiDamageDetector.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/AiFleetAssistant.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/AiReviewSummarizer.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/AiTripPlanner.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/AvailabilityCalendar.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/Car360Viewer.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/CarComparator.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/ColorSelect.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/CommandPalette.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/DatePicker.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/Footer.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/FormSubmitButton.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/LogoLink.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/Map.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/NavBar.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/NavBarItems.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/NotificationCenter.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/OrbitTripPlanner.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/PasswordTextBox.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/PersonalizedHeader.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/ProviderButton.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/Select.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/SidebarDrawer.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/SmartCarRecommender.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/TextBox.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/ThemeSwitcher.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/TimePicker.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/TripCostCalculator.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/UserProfile.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/VoiceBookingAssistant.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/WishlistContext.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/components/WishlistDrawer.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/customer/FindCarForm.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/customer/page.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `app/favicon.ico` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `app/fonts/GeistVF.woff` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `app/global-error.tsx` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `app/globals.css` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `app/icons.tsx` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `app/layout.tsx` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `app/loading.tsx` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `app/not-found.tsx` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `app/pages/LoadingPage.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/pages/LoginPage.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/pages/SignupPage.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/pages/SignupWithEmailPage.tsx` | Source/config/document read | [Evidence](security-schema.md) |
| `app/payment/confirm/[session_id]/ConfirmPaymentClient.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/payment/confirm/[session_id]/page.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/payment/layout.tsx` | Source/config/document read | [Evidence](booking-admin.md) |
| `app/privacy-policy/page.tsx` | Source/config/document read | [Evidence](frontend-features.md) |
| `database.types.ts` | Source/config/document read | [Evidence](security-schema.md) |
| `lib/supabase/client.ts` | Source/config/document read | [Evidence](security-schema.md) |
| `lib/supabase/middleware.ts` | Source/config/document read | [Evidence](security-schema.md) |
| `lib/supabase/server.ts` | Source/config/document read | [Evidence](security-schema.md) |
| `lib/types/fuelTypes.ts` | Source/config/document read | [Evidence](security-schema.md) |
| `lib/types/models.ts` | Source/config/document read | [Evidence](security-schema.md) |
| `lib/types/rentTimes.ts` | Source/config/document read | [Evidence](security-schema.md) |
| `lib/util/availability.ts` | Source/config/document read | [Evidence](booking-admin.md) |
| `lib/util/util.ts` | Source/config/document read | [Evidence](booking-admin.md) |
| `middleware.ts` | Source/config/document read | [Evidence](security-schema.md) |
| `next.config.mjs` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `package-lock.json` | Lockfile structure, versions, dependency graph and registry audit | [Evidence](../SYSTEM_AUDIT.md) |
| `package.json` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `postcss.config.mjs` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `public/Videos/AdminLog.mp4` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/Videos/CustomerLog.mp4` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/Videos/FrontBG.mp4` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/BMWM2.jpg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/New folder/logo-dark.png` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/New folder/logo-dark.svg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/New folder/logo-light.png` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/New folder/logo-light.svg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/admin-dashboard-bookings-card.jpeg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/admin-dashboard-cars-card.jpg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/auth-background.jpg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/car-owners.jpg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/customer-dashboard.jpg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/leaflet/marker-icon.png` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/leaflet/marker-shadow.png` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/logo-dark.svg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/logo-light.svg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/social-media-image.jpg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/testimonials/user (1).jpg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/testimonials/user (2).jpg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `public/images/testimonials/user (3).jpg` | Asset inventory/use/size; not exhaustive frame/pixel inspection | [Evidence](../SYSTEM_AUDIT.md) |
| `supabase/.gitignore` | Source/config/document read | [Evidence](security-schema.md) |
| `supabase/config.toml` | Source/config/document read | [Evidence](security-schema.md) |
| `supabase/migrations/001_schema_overhaul.sql` | Source/config/document read | [Evidence](security-schema.md) |
| `supabase/migrations/002_reset_and_rebuild_schema.sql` | Source/config/document read | [Evidence](security-schema.md) |
| `supabase/migrations/003_payment_sessions.sql` | Source/config/document read | [Evidence](security-schema.md) |
| `tailwind.config.ts` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
| `tsconfig.json` | Source/config/document read | [Evidence](../SYSTEM_AUDIT.md) |
