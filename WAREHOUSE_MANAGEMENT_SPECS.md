# Warehouse Management Module - Technical Specifications

## Overview
Comprehensive Warehouse Management system that integrates with Branches, powers FIFO inventory, and aligns with OpenAccounting patterns.

## 1. Database Schema Changes

### Enhanced Warehouses Model
```prisma
model warehouses {
  id                         String                       @id
  organizationId             String
  branchId                   String                       // NEW: Link to branch
  name                       String
  code                       String?                      @unique
  address                    String?
  city                       String?                      // NEW
  state                      String?                      // NEW
  postalCode                 String?                      // NEW
  country                    String                       @default("Myanmar") // NEW
  phone                      String?                      // NEW
  email                      String?                      // NEW
  managerName                String?                      // NEW
  managerEmail               String?                      // NEW
  warehouseType              String                       @default("standard") // NEW: standard, cold_storage, hazmat
  capacity                   Decimal?                     @db.Decimal(12, 2) // NEW: Storage capacity
  currentUtilization         Decimal?                     @db.Decimal(5, 2) // NEW: % utilization
  isDefault                  Boolean                      @default(false)
  isActive                   Boolean                      @default(true)
  isPrimary                  Boolean                      @default(false) // NEW: Primary warehouse per branch
  allowNegativeInventory     Boolean                      @default(false) // NEW: Override negative inventory block
  autoReorderEnabled         Boolean                      @default(false) // NEW: Auto reorder capability
  costCenter                 String?                      // NEW: For GL allocation
  notes                      String?                      @db.Text // NEW
  createdAt                  DateTime                     @default(now())
  updatedAt                  DateTime
  
  // Relations
  organizations              organizations                @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  branches                   branches                     @relation(fields: [branchId], references: [id]) // NEW
  inventory_layers           inventory_layers[]
  inventory_movements        inventory_movements[]
  inventory_opening_balances inventory_opening_balances[]
  warehouse_permissions      warehouse_permissions[]      // NEW
  inventory_transfers_from   inventory_transfers[]        @relation("TransferFrom") // NEW
  inventory_transfers_to     inventory_transfers[]        @relation("TransferTo") // NEW

  @@unique([organizationId, name])
  @@unique([branchId, isPrimary]) // Only one primary per branch
  @@index([organizationId])
  @@index([branchId])
  @@index([isDefault])
  @@index([isActive])
  @@index([isPrimary])
  @@index([warehouseType])
}
```

### New Warehouse Permissions Model
```prisma
model warehouse_permissions {
  id           String      @id
  warehouseId  String
  userId       String
  permission   String      // view, manage, transfer, adjust, full_access
  createdAt    DateTime    @default(now())
  updatedAt    DateTime
  
  warehouses   warehouses  @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  users        users       @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([warehouseId, userId, permission])
  @@index([warehouseId])
  @@index([userId])
}
```

### New Inventory Transfers Model
```prisma
model inventory_transfers {
  id                String                    @id
  organizationId    String
  transferNumber    String                    @unique
  fromWarehouseId   String
  toWarehouseId     String
  status            String                    @default("draft") // draft, in_transit, completed, cancelled
  transferDate      DateTime
  expectedDate      DateTime?
  completedDate     DateTime?
  notes             String?                   @db.Text
  totalValue        Decimal                   @db.Decimal(12, 2)
  journalId         String?                   @unique
  createdBy         String
  approvedBy        String?
  createdAt         DateTime                  @default(now())
  updatedAt         DateTime
  
  // Relations
  organizations     organizations             @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  from_warehouse    warehouses                @relation("TransferFrom", fields: [fromWarehouseId], references: [id])
  to_warehouse      warehouses                @relation("TransferTo", fields: [toWarehouseId], references: [id])
  journals          journals?                 @relation(fields: [journalId], references: [id])
  transfer_items    inventory_transfer_items[]
  
  @@index([organizationId])
  @@index([fromWarehouseId])
  @@index([toWarehouseId])
  @@index([status])
  @@index([transferDate])
}

model inventory_transfer_items {
  id                String              @id
  transferId        String
  itemId            String
  quantity          Decimal             @db.Decimal(12, 4)
  unitCost          Decimal             @db.Decimal(12, 4)
  totalValue        Decimal             @db.Decimal(12, 2)
  notes             String?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime
  
  // Relations
  transfers         inventory_transfers @relation(fields: [transferId], references: [id], onDelete: Cascade)
  products          products            @relation(fields: [itemId], references: [id])
  
  @@index([transferId])
  @@index([itemId])
}
```

### Enhanced Branches Model
```prisma
model branches {
  // ... existing fields ...
  warehouses       warehouses[]         // NEW: One-to-many relationship
}
```

## 2. API Endpoints Specification

### Warehouse Management
```
GET    /api/warehouses                    # List warehouses with branch info
POST   /api/warehouses                    # Create warehouse
GET    /api/warehouses/:id                # Get warehouse details
PUT    /api/warehouses/:id                # Update warehouse
DELETE /api/warehouses/:id                # Delete warehouse (if no inventory)
PATCH  /api/warehouses/:id/status         # Activate/deactivate
PATCH  /api/warehouses/:id/primary        # Set as primary for branch

# Permissions
GET    /api/warehouses/:id/permissions    # Get warehouse permissions
POST   /api/warehouses/:id/permissions    # Grant permission
DELETE /api/warehouses/:id/permissions/:userId # Revoke permission

# Inventory Operations
GET    /api/warehouses/:id/inventory      # Get inventory levels
GET    /api/warehouses/:id/movements      # Get movement history
POST   /api/warehouses/:id/adjustments    # Create inventory adjustment
```

### Inventory Transfers
```
GET    /api/inventory-transfers           # List transfers
POST   /api/inventory-transfers           # Create transfer
GET    /api/inventory-transfers/:id       # Get transfer details
PUT    /api/inventory-transfers/:id       # Update transfer
DELETE /api/inventory-transfers/:id       # Delete draft transfer
POST   /api/inventory-transfers/:id/confirm # Confirm transfer
POST   /api/inventory-transfers/:id/complete # Complete transfer
```

### Branch-Warehouse Integration
```
GET    /api/branches/:id/warehouses       # Get warehouses for branch
POST   /api/branches/:id/warehouses       # Create warehouse for branch
GET    /api/branches/:id/primary-warehouse # Get primary warehouse
```

## 3. Business Rules

### Warehouse Management
1. **Branch Linkage**: Every warehouse must belong to a branch
2. **Primary Warehouse**: Each branch must have exactly one primary warehouse
3. **Permissions**: Users need explicit permissions to access warehouses
4. **Activation**: Only active warehouses can be used for transactions
5. **Deletion**: Warehouses with inventory cannot be deleted

### Inventory Rules
1. **FIFO Only**: All inventory valuation uses FIFO method
2. **Negative Inventory**: Blocked by default, can be overridden per warehouse
3. **Multi-Warehouse**: Items can exist in multiple warehouses
4. **Transfers**: Inventory can be transferred between warehouses
5. **Adjustments**: Manual adjustments require proper authorization

### Document Integration
1. **Purchase Orders**: Must specify destination warehouse
2. **Sales Orders**: Must specify source warehouse
3. **Invoices**: Automatically consume from primary warehouse if not specified
4. **Adjustments**: Must specify warehouse and reason

## 4. OpenAccounting Integration

### Journal Entry Patterns
```javascript
// Inventory Transfer
Dr. Inventory Asset (To Warehouse)     $1,000
    Cr. Inventory Asset (From Warehouse)       $1,000

// Inventory Adjustment (Increase)
Dr. Inventory Asset                    $500
    Cr. Inventory Adjustment                   $500

// Inventory Adjustment (Decrease)
Dr. Inventory Adjustment               $300
    Cr. Inventory Asset                        $300
```

### OA API Alignment
- Use OA chart of accounts for inventory accounts
- Follow OA journal entry structure
- Maintain OA transaction numbering
- Sync with OA reporting requirements

## 5. UI/UX Requirements

### Warehouse Management Dashboard
- List all warehouses with branch, status, and utilization
- Quick actions: activate/deactivate, set primary
- Search and filter by branch, status, type
- Bulk operations support

### Warehouse Details Page
- General information and settings
- Inventory levels and movements
- User permissions management
- Transfer history
- Performance metrics

### Inventory Transfer Workflow
- Multi-step wizard for creating transfers
- Real-time inventory availability check
- Approval workflow for large transfers
- Tracking and status updates

### Branch Integration
- Warehouse selection in branch settings
- Primary warehouse designation
- Warehouse performance by branch

## 6. Performance Considerations

### Database Optimization
- Proper indexing on frequently queried fields
- Partitioning for large movement tables
- Efficient FIFO queries with date ordering
- Cached inventory level calculations

### API Performance
- Pagination for large result sets
- Efficient joins for warehouse-branch data
- Redis caching for frequently accessed data
- Bulk operations for transfers

## 7. Security & Permissions

### Access Control
- Role-based warehouse access
- Branch-level permissions inheritance
- Audit trail for all operations
- Secure transfer approvals

### Data Validation
- Warehouse capacity limits
- Inventory availability checks
- Transfer authorization requirements
- Proper error handling and logging

## 8. Testing Strategy

### Unit Tests
- FIFO calculation accuracy
- Warehouse permission validation
- Transfer workflow logic
- Journal entry creation

### Integration Tests
- End-to-end transfer process
- Multi-warehouse inventory operations
- Branch-warehouse relationships
- OA API integration

### Performance Tests
- Large inventory movement processing
- Concurrent transfer operations
- Database query optimization
- Cache effectiveness

## 9. Migration Strategy

### Phase 1: Schema Updates
- Add new columns to warehouses table
- Create new permission and transfer tables
- Update existing data with branch links

### Phase 2: API Implementation
- Implement warehouse management endpoints
- Add transfer functionality
- Enhance inventory operations

### Phase 3: UI Development
- Build warehouse management interface
- Create transfer workflow
- Update existing forms with warehouse selection

### Phase 4: Integration
- Wire OA journal entries
- Implement permission checks
- Add audit logging

## 10. Acceptance Criteria

### Functional Requirements
- ✅ Complete warehouse CRUD operations
- ✅ Branch-warehouse relationships
- ✅ User permission management
- ✅ Inventory transfer workflow
- ✅ FIFO inventory processing
- ✅ OA journal integration

### Technical Requirements
- ✅ Proper database schema design
- ✅ RESTful API implementation
- ✅ Comprehensive error handling
- ✅ Performance optimization
- ✅ Security implementation
- ✅ Test coverage > 80%

### Business Requirements
- ✅ Multi-tenant support
- ✅ Audit trail maintenance
- ✅ Negative inventory prevention
- ✅ Transfer approval workflow
- ✅ Reporting integration
- ✅ User-friendly interface
