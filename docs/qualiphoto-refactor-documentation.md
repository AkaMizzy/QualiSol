# QualiPhoto Feature Refactor Documentation

## Overview

This document explains the refactoring work done on the QualiPhoto feature, which is a comprehensive photo management system for quality control in construction projects. The refactor focused on improving code organization, maintainability, and separation of concerns.

## Architecture Overview

The QualiPhoto feature follows a hierarchical structure:
- **Folders** (Dossiers) - Top-level containers for organizing qualiphotos
- **Parent QualiPhotos** - Main quality control photos
- **Child QualiPhotos** - Follow-up photos related to a parent
- **Complementary QualiPhotos** - "After" photos that complement a child photo (before/after comparison)

## File Structure

```
components/reception/
├── QualiPhotoDetail.tsx              # Main detail modal (orchestrator)
├── ParentQualiPhotoView.tsx         # View component for parent qualiphotos
├── ChildQualiPhotoView.tsx          # View component for child qualiphotos
├── CreateQualiPhotoModal.tsx        # Modal for creating folders
├── CreateChildQualiPhotoModal.tsx   # Modal for creating child qualiphotos
├── CreateComplementaireQualiPhotoModal.tsx  # Modal for complementary photos
├── ComparisonModal.tsx              # Modal for before/after image comparison
├── SignatureFieldQualiphoto.tsx    # Signature input component
├── PhotoActions.tsx                 # Reusable photo action buttons
└── PhotoCard.tsx                    # Reusable photo card component

app/(tabs)/
└── qualiphoto.tsx                   # Main gallery/list screen

services/
└── qualiphotoService.ts             # API service layer
```

## Key Refactoring Changes

### 1. Component Separation

**Before:** The `QualiPhotoDetail` component was a monolithic file containing all view logic for both parent and child qualiphotos.

**After:** The component was split into:
- `QualiPhotoDetail.tsx` - Acts as an orchestrator/router that manages state and delegates rendering
- `ParentQualiPhotoView.tsx` - Handles all UI for parent qualiphotos
- `ChildQualiPhotoView.tsx` - Handles all UI for child qualiphotos

**Benefits:**
- Improved code readability and maintainability
- Easier to test individual components
- Clear separation of concerns
- Reduced cognitive load when working on specific features

### 2. State Management Pattern

The `QualiPhotoDetail` component uses a centralized state management approach:

```typescript
// Main state in QualiPhotoDetail
const [item, setItem] = useState<QualiPhotoItem | null>(initialItem || null);
const [children, setChildren] = useState<QualiPhotoItem[]>([]);
const [complement, setComplement] = useState<QualiPhotoItem | null>(null);
const [comments, setComments] = useState<Comment[]>([]);
// ... many more state variables
```

**State Flow:**
1. `QualiPhotoDetail` manages all state and side effects
2. State is passed down as props to view components
3. View components are pure presentation components (with minimal local state)
4. Callbacks are passed down for user interactions

### 3. Conditional Rendering Logic

The component uses a smart routing pattern:

```typescript
const renderDetailView = () => {
  if (!item) return null;
  
  if (item?.id === initialItem?.id) {
    return <ParentQualiPhotoView {...parentProps} />;
  } else {
    return <ChildQualiPhotoView {...childProps} />;
  }
};
```

This allows the same modal to handle different views based on the current item context.

## Component Responsibilities

### QualiPhotoDetail.tsx (Orchestrator)

**Responsibilities:**
- State management for the entire detail view
- Data fetching (children, comments, complements, signatures)
- Audio playback management
- Modal visibility control
- Navigation between different views (map, image preview, child modal, etc.)
- Business logic (comparison, PDF generation, comment submission)

**Key Features:**
- Handles parent/child navigation
- Manages complementary photo relationships
- Coordinates signature workflows
- Integrates with declaration creation
- Handles image comparison functionality

### ParentQualiPhotoView.tsx

**Responsibilities:**
- Rendering parent qualiphoto details
- Displaying child photos in grid/list layouts
- Managing child photo sorting and filtering
- Handling parent-specific actions (PDF generation, signatures)
- Displaying complementary photo information

**Props Interface:**
```typescript
type ParentQualiPhotoViewProps = {
  item: QualiPhotoItem;
  initialItem: QualiPhotoItem | null;
  onClose: () => void;
  subtitle: string;
  handleGeneratePdf: () => void;
  isGeneratingPdf: boolean;
  setSignatureModalVisible: (visible: boolean) => void;
  setImagePreviewVisible: (visible: boolean) => void;
  childPhotos: QualiPhotoItem[];
  playSound: () => void;
  isPlaying: boolean;
  handleMapPress: () => void;
  setCommentModalVisible: (visible: boolean) => void;
  setComplementModalVisible: (visible: boolean) => void;
  complement: QualiPhotoItem | null;
  isLoadingComplement: boolean;
  comments: Comment[];
  isLoadingComments: boolean;
  layoutMode: 'grid' | 'list';
  setLayoutMode: (mode: 'grid' | 'list') => void;
  setChildModalVisible: (visible: boolean) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  isLoadingChildren: boolean;
  childIdToHasComplement: Record<string, boolean>;
  setItem: (item: QualiPhotoItem) => void;
};
```

### ChildQualiPhotoView.tsx

**Responsibilities:**
- Rendering child qualiphoto details
- Displaying complementary "after" photos
- Handling child-specific actions (comparison, declaration creation)
- Managing comment display and creation
- Handling navigation back to parent

**Props Interface:**
```typescript
type ChildQualiPhotoViewProps = {
  item: QualiPhotoItem;
  initialItem: QualiPhotoItem | null | undefined;
  setItem: (item: QualiPhotoItem | null) => void;
  subtitle: string;
  setEditPlanVisible: (visible: boolean) => void;
  setImagePreviewVisible: (visible: boolean) => void;
  hasActionsOrDescription: boolean;
  isActionsVisible: boolean;
  setActionsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  playSound: () => void;
  isPlaying: boolean;
  handleMapPress: () => void;
  setCommentModalVisible: (visible: boolean) => void;
  setDeclPrefill: (prefill: any) => void;
  setDeclModalVisible: (visible: boolean) => void;
  comments: Comment[];
  isLoadingComments: boolean;
  complement: QualiPhotoItem | null;
  isLoadingComplement: boolean;
  handleCompare: (beforeUrl: string | null, afterUrl: string | null) => void;
  deleteComplement: () => void;
  setPreviewImageUri: (uri: string | null) => void;
  hasComplementActionsOrDescription: boolean;
  isComplementActionsVisible: boolean;
  setComplementActionsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  playComplementSound: () => void;
  isPlayingComp: boolean;
  handleComplementMapPress: () => void;
  setComplementModalVisible: (visible: boolean) => void;
};
```

## Service Layer

### qualiphotoService.ts

The service layer provides a clean API abstraction:

**Main Exports:**
- `Folder` - Interface for folder/dossier entities
- `Project` - Interface for project entities
- `Zone` - Interface for zone entities
- `CreateFolderPayload` - Type for folder creation

**Functions:**
- `getAllFolders(token)` - Fetch all folders
- `createFolder(payload, token)` - Create a new folder
- `getAllProjects(token)` - Fetch all projects
- `getZonesByProjectId(projectId, token)` - Fetch zones for a project
- `getAllZones(token)` - Fetch all zones

**Note:** The service file appears to handle folder operations. QualiPhotoItem operations may be in a separate service or the same file with additional exports not shown in the current structure.

## Data Flow

### Folder Creation Flow

1. User opens `CreateQualiPhotoModal` from `qualiphoto.tsx`
2. User fills in folder details (title, description, assigns users)
3. Modal calls `folderService.createFolder(payload, token)`
4. On success, modal closes and detail view opens with new folder
5. `QualiPhotoDetail` loads folder data

### Child Photo Creation Flow

1. User is viewing a parent qualiphoto
2. User clicks "Add Child Photo" button
3. `CreateChildQualiPhotoModal` opens
4. User captures/selects photo and fills details
5. Modal calls API to create child qualiphoto
6. `handleChildSuccess` callback refreshes children list
7. New child appears in parent's child list

### Complementary Photo Flow

1. User is viewing a child qualiphoto
2. User clicks "Add Complementary Photo" button
3. `CreateComplementaireQualiPhotoModal` opens
4. User captures "after" photo
5. Modal creates complementary photo linked to child
6. `handleComplementSuccess` updates complement state
7. Comparison functionality becomes available

## Key Features

### 1. Image Comparison

The system supports before/after image comparison:
- Uses AI service to generate comparison descriptions
- Displays side-by-side comparison in `ComparisonModal`
- Handles loading and error states gracefully

### 2. Signature Workflow

Three-tier signature system:
- **Technicien** - Technical worker signature
- **Control** - Controller signature  
- **Admin** - Administrator signature

Each signature:
- Is role-based (only assigned user can sign)
- Prevents duplicate signatures
- Displays signer name from project users
- Uses `SignatureFieldQualiphoto` component

### 3. Comments System

- Comments are only available for child qualiphotos
- Comments are fetched and displayed in real-time
- Users can add new comments via modal
- Comments are persisted to backend

### 4. Layout Modes

Parent view supports two layout modes for child photos:
- **Grid View** - 2-column grid with thumbnails
- **List View** - Vertical list with more details

Users can toggle between modes using layout toggle buttons.

### 5. Sorting

Child photos can be sorted:
- **Ascending** - Oldest first
- **Descending** - Newest first (default)

### 6. PDF Generation

Parent qualiphotos can generate PDFs:
- Calls backend API to generate PDF
- Opens generated PDF in external viewer
- Shows loading state during generation

## State Management Patterns

### Preventing Race Conditions

The code uses refs to prevent race conditions in async operations:

```typescript
const fetchingRef = useRef(false);
const requestIdRef = useRef(0);

const fetchFolders = useCallback(async () => {
  if (fetchingRef.current) return;
  fetchingRef.current = true;
  const requestId = ++requestIdRef.current;
  // ... async operation
  if (requestId !== requestIdRef.current) return; // Ignore stale results
}, [token]);
```

### Optimistic Updates

Some operations use optimistic updates:

```typescript
// Optimistic update
setSignatures(prev => ({ ...prev, [role]: { signature } }));
// Then reload to confirm
await loadSignatures();
```

## Error Handling

### Graceful Degradation

The system handles errors gracefully:
- Failed API calls don't crash the UI
- Loading states are shown during operations
- Error messages are displayed in alert banners
- Empty states are shown when no data is available

### Silent Failures

Some operations fail silently (by design):
- Image description generation
- Location fetching
- User data fetching for signatures

This prevents non-critical failures from disrupting the user experience.

## Performance Considerations

### 1. Memoization

The code uses `useMemo` and `useCallback` strategically:
- `useMemo` for computed values (subtitles, hasActions flags)
- `useCallback` for stable function references
- Prevents unnecessary re-renders

### 2. Conditional Data Fetching

Data is only fetched when needed:
- Children are only loaded for parent qualiphotos
- Complements are only loaded for child qualiphotos
- Comments are only loaded for child qualiphotos
- Signatures are loaded on demand

### 3. Background Operations

Some operations run in background:
- Complement flags are fetched in parallel
- Project users are loaded asynchronously
- Image descriptions are generated without blocking UI

## Testing Considerations

### Component Testing

Each component can be tested independently:
- `ParentQualiPhotoView` - Test with mock parent item
- `ChildQualiPhotoView` - Test with mock child item
- `QualiPhotoDetail` - Test state management and routing logic

### Service Testing

The service layer can be mocked:
- Mock API responses
- Test error handling
- Verify payload construction

## Common Patterns

### Modal Management

Modals are controlled via boolean state:
```typescript
const [isChildModalVisible, setChildModalVisible] = useState(false);
const [isComplementModalVisible, setComplementModalVisible] = useState(false);
const [isCommentModalVisible, setCommentModalVisible] = useState(false);
```

### Loading States

Each async operation has its own loading state:
```typescript
const [isLoadingChildren, setIsLoadingChildren] = useState(false);
const [isLoadingComplement, setIsLoadingComplement] = useState(false);
const [isLoadingComments, setIsLoadingComments] = useState(false);
```

### Success Callbacks

Modals use success callbacks to update parent state:
```typescript
onSuccess={(created) => {
  setModalVisible(false);
  if (created) {
    setSelectedItem(created as Folder);
    setDetailVisible(true);
  }
  fetchFolders();
}}
```

## Future Enhancements

### Potential Improvements

1. **Type Safety**: Ensure `QualiPhotoItem` interface is properly exported and typed
2. **Error Boundaries**: Add React error boundaries for better error handling
3. **Offline Support**: Consider adding offline capabilities for photo capture
4. **Image Optimization**: Implement image compression before upload
5. **Caching**: Add caching layer for frequently accessed data
6. **Pagination**: Implement pagination for large child photo lists
7. **Search/Filter**: Add search and filter capabilities to gallery view

## Migration Notes

### For Developers

When working with this codebase:

1. **Always check if item is parent or child** before rendering specific views
2. **Use the provided callbacks** instead of directly manipulating state
3. **Follow the prop interfaces** when extending components
4. **Maintain the separation of concerns** - don't mix view logic with business logic
5. **Handle loading and error states** in all async operations
6. **Use TypeScript types** - avoid `any` types where possible

### Breaking Changes

If modifying the component structure:
- Update prop interfaces in both view components
- Ensure state management in `QualiPhotoDetail` is updated
- Update all callbacks passed to child components
- Test both parent and child views after changes

## API Integration

### Backend Endpoints

The frontend expects these backend endpoints (inferred from code):

- `GET /api/folders` - Get all folders
- `POST /api/folders` - Create folder
- `GET /api/projets` - Get all projects
- `GET /api/zones` - Get all zones
- `GET /api/zones/project/:projectId` - Get zones by project
- `GET /api/qualiphoto/:id` - Get qualiphoto details
- `GET /api/qualiphoto/:id/children` - Get child qualiphotos
- `GET /api/qualiphoto/:id/comments` - Get comments
- `POST /api/qualiphoto/:id/comments` - Add comment
- `POST /api/qualiphoto/:id/signatures` - Save signature
- `GET /api/qualiphoto/:id/signatures` - Get signatures
- `POST /api/qualiphoto/:id/pdf` - Generate PDF
- `POST /api/qualiphoto/compare` - Compare images

### Authentication

All API calls require Bearer token authentication:
```typescript
headers: { Authorization: `Bearer ${token}` }
```

## Color Palette

The UI follows the project's color palette:
- **Primary Orange**: `#f87b1b` - Main actions, borders, highlights
- **Primary Blue**: `#11224e` - Text, headers, important elements
- **Background**: `#FFFFFF` - Main background
- **Secondary**: `#6b7280` - Muted text, icons

## Conclusion

This refactor significantly improves the codebase by:
- Separating concerns into logical components
- Improving maintainability and testability
- Making the codebase easier to understand and extend
- Following React best practices
- Maintaining backward compatibility with existing functionality

The architecture is now more scalable and ready for future enhancements.
