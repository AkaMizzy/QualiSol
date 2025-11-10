# Project-Related Files Refactoring Summary

## Overview
This document summarizes the comprehensive refactoring of project-related files to align with the new ORM-based backend architecture and token-based authentication flow.

## Date
Refactoring completed to match new backend structure.

---

## 1. Backend Changes

### 1.1 User Controller - New Endpoint
**File:** `stage_back/controllers/user.controller.js`

**Changes:**
- Added `getUsersByCompany` function to fetch users by company_id
- Security: Validates that requested company_id matches token's company_id
- Returns users excluding passwords
- Endpoint: `GET /api/users/company/:company_id`

**File:** `stage_back/routes/user.routes.js`
- Added route: `router.get("/company/:company_id", userController.getUsersByCompany)`
- Route placed before `/:id` to prevent route conflicts

### 1.2 Project Model - Database Column Mapping
**File:** `stage_back/models/projet.model.js`

**Changes:**
- Added field mapping for `projecttype_id` attribute to `project_type_id` database column
- Uses Sequelize's `field` option to map attribute name to actual database column

---

## 2. Frontend Service Layer

### 2.1 Project Service - Complete Refactor
**File:** `services/projectService.ts`

**Major Changes:**

#### Type Definitions
- **Updated `Project` type:**
  - Changed `id_company` → `company_id`
  - Changed `owner`, `control`, `technicien` → `owner_id`, `control_id`, `technicien_id`
  - Changed `status` → `status_id` (UUID string)
  - Changed `project_type_id` → `projecttype_id`
  - Added `description`, `createdAt`, `updatedAt` fields
  - Made `code` required (was nullable)

- **Updated `CreateProjectInput` type:**
  - Added `code` as required field
  - Added `description` as optional
  - Changed field names to match backend (`owner_id`, `control_id`, `technicien_id`, `projecttype_id`)
  - Removed `status` (backend manages it automatically)

- **Added `UpdateProjectInput` type:**
  - Partial type for updates
  - Excludes `status_id` (backend manages status)

#### API Methods
- **Renamed functions:**
  - `fetchUserProjects` → `getAllProjects`
  - `createUserProject` → `createProject`
  - `updateUserProject` → `updateProject`

- **New functions:**
  - `getProjectById(token, id)` - Fetch single project
  - `deleteProject(token, id)` - Delete project

- **Updated endpoints:**
  - All endpoints changed from `/user/projects` → `/api/projets`
  - All requests include `Authorization: Bearer ${token}` header

---

## 3. Frontend Components

### 3.1 Projects List Screen
**File:** `app/(tabs)/projects.tsx`

**Changes:**
- Updated to use `getAllProjects()` instead of `fetchUserProjects()`
- Removed all status-related logic (status fetching, status state, status badges)
- Removed status service import
- Updated `getStatusStyle` function removed (status no longer displayed)
- Project cards no longer show status badges
- Simplified UI to show only project title, code, dates, and project type

### 3.2 Project Detail Modal
**File:** `components/projects/ProjectDetailModal.tsx`

**Changes:**
- **Removed status management:**
  - Removed `statuses` prop
  - Removed all status-related state and functions
  - Removed status display from UI
  - Status is now read-only (managed by backend)

- **Updated field references:**
  - `project.id_company` → `project.company_id`
  - `project.owner` → `project.owner_id`
  - `project.control` → `project.control_id`
  - `project.technicien` → `project.technicien_id`

- **Refactored data fetching (optimization):**
  - **Company endpoint:** Updated from `/companies/${id}` → `/api/company/${id}` with authentication token
  - **User fetching:** Replaced individual user API calls (`/users/${id}`) with single `/api/users` call
  - Users are now loaded upfront when modal opens (not just when entering edit mode)
  - Added new `useEffect` to derive `owner`, `control`, and `technicien` states from `companyUsers` list
  - Removed redundant `loadUsers` useEffect that only loaded when editing
  - Removed unused `loadingUsers` state (now uses `isLoading`)

- **Updated API calls:**
  - Changed `updateUserProject` → `updateProject`
  - Updated zones endpoint from `/user/projects/${id}/zones` → `/api/zones` with frontend filtering
  - Updated user fetching to use `/api/users` (token-based, no company_id param needed)
  - Company fetch now includes `Authorization: Bearer ${token}` header

- **Update payload:**
  - Removed `status_id` from update payload
  - Only sends `owner_id`, `control_id`, `technicien_id` for updates

### 3.3 Create Project Modal
**File:** `components/projects/CreateProjectModal.tsx`

**Changes:**
- **Removed code input field:**
  - Code is now auto-generated on submit using `generateProjectCode()` function
  - Format: `PRJ-{timestamp}`

- **Made fields optional:**
  - `dd` (start date) - optional
  - `df` (end date) - optional
  - `projecttype_id` - optional
  - `description` - optional
  - `owner_id` - optional

- **Updated validation:**
  - Only validates `title`, `control_id`, `technicien_id` as required
  - Date validation only runs if both dates are provided
  - Removed code validation

- **Updated API calls:**
  - Changed `createUserProject` → `createProject`
  - Updated project types endpoint: `/project-types` → `/api/projettype`
  - Updated user fetching: `/users/company/${company_id}` → `/api/users` (token-based)

- **Form submission:**
  - Auto-generates code before submission
  - Sends only provided optional fields (undefined if not provided)

### 3.4 Zone Create Modal
**File:** `components/zone/CreateZoneModal.tsx`

**Changes:**
- Updated user fetching to use `/api/users` endpoint (token-based)
- Removed dependency on `user.company_id` in URL

---

## 4. Removed Files

### 4.1 Status Service
**File:** `services/statusService.ts` - **DELETED**

**Reason:**
- Status management is now entirely handled by the backend
- Frontend no longer needs to fetch or display status information

---

## 5. Key Architectural Changes

### 5.1 Authentication Flow
- All API requests now use Bearer token authentication
- Token is retrieved from `AuthContext` via `useAuth()` hook
- Backend validates `company_id` from token, not from request parameters

### 5.2 Status Management
- **Backend Responsibility:**
  - Backend automatically sets `status_id` to "Pending" when creating projects
  - Frontend cannot modify project status
  - Status is read-only in the UI

- **Frontend Changes:**
  - Removed all status fetching logic
  - Removed status display from project cards
  - Removed status editing from project detail modal

### 5.3 Data Model Alignment
- Frontend types now match backend ORM structure exactly
- Field naming convention: `{entity}_id` for foreign keys
- Database column mapping handled via Sequelize `field` option where needed

### 5.4 API Endpoint Standardization
- All project endpoints: `/api/projets`
- All user endpoints: `/api/users` (with token-based filtering)
- All project type endpoints: `/api/projettype`
- All zone endpoints: `/api/zones`
- Company endpoints: `/api/company/:id` (with token-based authentication)

---

## 6. Testing Checklist

✅ Projects list displays correctly with new data structure  
✅ Create project works with new field names and optional fields  
✅ Update project works with new field names (excluding status)  
✅ Delete project works  
✅ Token authentication works for all requests  
✅ Error handling for expired/invalid tokens  
✅ User dropdowns populate correctly using token-based endpoint  
✅ Project type dropdowns work correctly  
✅ Zones are filtered correctly by project_id  
✅ Project detail modal loads all users efficiently (single API call)  
✅ Company information loads with proper authentication  

---

## 7. Breaking Changes

### 7.1 Removed Features
- ❌ Status display in project cards
- ❌ Status editing in project detail modal
- ❌ Manual code input in create project form
- ❌ Status service and all status-related API calls

### 7.2 Changed Behavior
- Code is now auto-generated (was user-input)
- Dates are optional (were required)
- Project type is optional (was required)
- Status cannot be modified by frontend (was editable)

---

## 8. Migration Notes

### For Developers
1. **Token Management:**
   - Ensure `AuthContext` provides valid token
   - Token must include `company_id` in payload

2. **API Calls:**
   - Always use `/api/` prefix for all endpoints
   - Always include `Authorization: Bearer ${token}` header
   - Use token-based endpoints instead of passing `company_id` in URL

3. **Field Names:**
   - Use `{entity}_id` format for all foreign key fields
   - Use `projecttype_id` in code (maps to `project_type_id` in database)

4. **Status Handling:**
   - Do not attempt to fetch, display, or modify project status
   - Status is managed entirely by backend

---

## 9. Files Modified

### Backend
- `stage_back/controllers/user.controller.js`
- `stage_back/routes/user.routes.js`
- `stage_back/models/projet.model.js`

### Frontend
- `services/projectService.ts`
- `app/(tabs)/projects.tsx`
- `components/projects/ProjectDetailModal.tsx`
- `components/projects/CreateProjectModal.tsx`
- `components/zone/CreateZoneModal.tsx`

### Deleted
- `services/statusService.ts`

---

## 10. Summary

This refactoring successfully:
- ✅ Aligned frontend with new ORM-based backend architecture
- ✅ Implemented proper token-based authentication flow
- ✅ Removed frontend status management (now backend-only)
- ✅ Updated all field names to match backend schema
- ✅ Made appropriate fields optional in create form
- ✅ Fixed user dropdown population using token-based endpoint
- ✅ Standardized all API endpoints with `/api/` prefix
- ✅ Improved error handling and validation
- ✅ Optimized Project Detail Modal data fetching (reduced from 4 API calls to 2)
- ✅ Added authentication tokens to all API requests including company endpoint

The project-related functionality is now fully integrated with the new backend and follows the updated authentication and data model patterns.

