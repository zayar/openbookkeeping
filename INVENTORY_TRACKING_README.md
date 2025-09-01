# Inventory Tracking System - Implementation Guide

## Overview

This document provides a comprehensive guide to the Inventory Tracking system implemented for the OpenAccounting platform. The system provides complete FIFO (First-In-First-Out) inventory management with double-entry accounting integration.

## Features

### ✅ Core Functionality
- **FIFO Inventory Valuation**: Automatic first-in-first-out cost calculation
- **Multi-Warehouse Support**: Track inventory across multiple locations
- **Opening Balances**: Set initial inventory values with proper journal entries
- **Real-time Inventory Levels**: Accurate stock tracking with movement history
- **Double-Entry Integration**: All inventory transactions create proper journal entries
- **Cost of Goods Sold (COGS)**: Automatic COGS calculation on sales

### ✅ User Interface
- **Enhanced Item Form**: Toggle inventory tracking with warehouse-specific opening balances
- **Opening Balances Management**: Dedicated settings page for managing initial inventory
- **Inventory Account Integration**: Filtered account selection for inventory assets
- **Real-time Validation**: Comprehensive validation with meaningful error messages

## Architecture

### Database Schema

#### Extended Tables
```sql
-- Extended products table
ALTER TABLE products ADD COLUMN trackInventory BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN inventoryAccountId VARCHAR(255);
ALTER TABLE products ADD COLUMN inventoryValuationMethod VARCHAR(50) DEFAULT 'FIFO';
ALTER TABLE products ADD COLUMN currentStock DECIMAL(15,4) DEFAULT 0;
ALTER TABLE products ADD COLUMN lowStockAlert DECIMAL(15,4);

-- New inventory tables
CREATE TABLE warehouses (
  id VARCHAR(255) PRIMARY KEY,
  organizationId VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  address TEXT,
  isDefault BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE
);

CREATE TABLE inventory_opening_balances (
  id VARCHAR(255) PRIMARY KEY,
  itemId VARCHAR(255) NOT NULL,
  warehouseId VARCHAR(255) NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  unitCost DECIMAL(15,4) NOT NULL,
  totalValue DECIMAL(15,4) NOT NULL,
  asOfDate DATETIME NOT NULL,
  journalId VARCHAR(255)
);

CREATE TABLE inventory_layers (
  id VARCHAR(255) PRIMARY KEY,
  itemId VARCHAR(255) NOT NULL,
  warehouseId VARCHAR(255) NOT NULL,
  quantityRemaining DECIMAL(15,4) NOT NULL,
  unitCost DECIMAL(15,4) NOT NULL,
  sourceType VARCHAR(50) NOT NULL,
  sourceId VARCHAR(255)
);

CREATE TABLE inventory_movements (
  id VARCHAR(255) PRIMARY KEY,
  itemId VARCHAR(255) NOT NULL,
  warehouseId VARCHAR(255) NOT NULL,
  layerId VARCHAR(255),
  direction ENUM('in', 'out') NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  unitCost DECIMAL(15,4) NOT NULL,
  totalValue DECIMAL(15,4) NOT NULL,
  movementType VARCHAR(50) NOT NULL,
  sourceType VARCHAR(50) NOT NULL,
  sourceId VARCHAR(255),
  journalId VARCHAR(255),
  reference VARCHAR(255)
);
```

### Service Layer

#### Inventory Service (`apps/bff/services/inventory-service.js`)

The core inventory service provides the following methods:

```javascript
// Create opening balance with journal entry
await inventoryService.createOpeningBalance(itemId, warehouseId, quantity, unitCost, asOfDate, organizationId)

// Process inventory inbound (purchases)
await inventoryService.processInbound(itemId, warehouseId, quantity, unitCost, sourceType, sourceId)

// Process inventory outbound with FIFO (sales)
await inventoryService.processOutbound(itemId, warehouseId, quantity, sourceType, sourceId, organizationId)

// Create COGS journal entry
await inventoryService.createCOGSJournal(itemId, totalCost, sourceId, organizationId)

// Get current inventory levels
await inventoryService.getInventoryLevels(itemId)

// Get movement history
await inventoryService.getMovementHistory(itemId, warehouseId, limit)
```

### API Endpoints

#### Items Management
```
GET    /api/items                    # List items with inventory levels
POST   /api/items                    # Create item with opening balances
PUT    /api/items/:id                # Update item inventory settings
GET    /api/items/:id/inventory      # Get inventory levels for item
GET    /api/items/:id/movements      # Get movement history for item
POST   /api/items/:id/opening-balance # Create opening balance
```

#### Warehouse Management
```
GET    /api/warehouses               # List warehouses
POST   /api/warehouses               # Create warehouse
```

#### Opening Balances
```
GET    /api/opening-balances         # List all opening balances
```

#### Invoice Processing
```
POST   /api/invoices/:id/confirm     # Confirm invoice with inventory processing
```

## Usage Guide

### 1. Enable Inventory Tracking

To enable inventory tracking for an item:

1. Navigate to **Items → New Item** or edit existing item
2. Set **Type** to "Goods"
3. Toggle **Track inventory** to ON
4. Select an **Inventory Account** (filtered to Stock type accounts)
5. Set **Reorder Point** if desired
6. Add **Opening Balances** per warehouse if needed

### 2. Set Opening Balances

Opening balances can be set during item creation or managed separately:

**During Item Creation:**
- In the item form, expand the "Opening Balances" section
- Enter quantity and unit cost for each warehouse
- System automatically creates journal entries and inventory layers

**Via Settings Page:**
- Navigate to **Settings → Opening Balances**
- View all opening balances with search and filtering
- Monitor journal entry status

### 3. Process Sales (Inventory Consumption)

When confirming an invoice with tracked items:

1. Create invoice with tracked items
2. Click **Confirm Invoice**
3. System automatically:
   - Consumes inventory using FIFO method
   - Calculates accurate COGS
   - Creates journal entries (Dr COGS / Cr Inventory Asset)
   - Updates inventory levels

### 4. Monitor Inventory Levels

View real-time inventory levels:

- **Item Details**: Shows current stock levels per warehouse
- **Inventory Movements**: Complete audit trail of all transactions
- **Opening Balances**: Monitor initial inventory setup

## FIFO Processing Example

```
Initial Inventory Layers:
Layer 1: 100 units @ $80 (Jan 1)
Layer 2: 150 units @ $90 (Jan 15)
Layer 3: 75 units @ $100 (Feb 1)

Sale: 200 units (Feb 10)

FIFO Consumption:
- 100 units from Layer 1 @ $80 = $8,000
- 100 units from Layer 2 @ $90 = $9,000
Total COGS: $17,000

Remaining Inventory:
Layer 2: 50 units @ $90
Layer 3: 75 units @ $100
Total: 125 units valued at $12,500
```

## Journal Entry Examples

### Opening Balance
```
Dr. Inventory Asset         $8,000
    Cr. Opening Balance Equity      $8,000
(Opening inventory - 100 units @ $80)
```

### Purchase
```
Dr. Inventory Asset         $9,000
    Cr. Accounts Payable            $9,000
(Purchase - 100 units @ $90)
```

### Sale with COGS
```
# Sales Entry
Dr. Accounts Receivable     $15,000
    Cr. Sales Revenue               $15,000

# COGS Entry
Dr. Cost of Goods Sold     $8,500
    Cr. Inventory Asset             $8,500
```

## Validation Rules

### Item Creation
- Inventory tracking only available for "Goods" type items
- Inventory account must be selected when tracking is enabled
- Inventory account must be of type "Stock"
- Opening balance requires both quantity and unit cost

### Inventory Consumption
- Cannot consume more inventory than available
- FIFO processing prevents negative inventory
- Proper error messages for insufficient stock

### Account Management
- Cannot delete inventory accounts that are referenced by items
- Account filtering respects organization boundaries

## Error Handling

The system provides comprehensive error handling:

```javascript
// Insufficient inventory
"Insufficient inventory. Available: 50, Required: 75"

// Missing inventory account
"Inventory account not set for this item"

// Invalid item type
"Inventory tracking is only available for Goods type items"

// Missing opening balance data
"Opening balance requires both quantity and unit cost"
```

## Performance Considerations

### Database Optimization
- Proper indexing on frequently queried fields
- Efficient FIFO queries using creation date ordering
- Optimized inventory level calculations

### Caching
- Redis caching for frequently accessed inventory data
- Cache invalidation on inventory transactions
- Improved response times for inventory queries

## Testing

### Unit Tests
Comprehensive test suite covering:
- FIFO calculation logic
- Inventory level calculations
- Journal entry structure
- Validation rules
- Error handling

### Test Files
- `tests/inventory-simple.test.js` - Core logic unit tests
- `tests/inventory.test.js` - Integration tests (database required)

Run tests:
```bash
npm test -- tests/inventory-simple.test.js
```

## Migration Guide

### From Non-Tracked to Tracked Items

To convert existing items to inventory tracking:

1. **Backup Data**: Always backup before migration
2. **Update Item**: Enable tracking and set inventory account
3. **Set Opening Balance**: Use current stock levels as opening balance
4. **Verify Journals**: Ensure opening balance journals are created correctly

### Database Migration

The system includes automatic migration scripts:
- Extends existing tables with new columns
- Creates new inventory-related tables
- Sets up default warehouse
- Creates required chart of accounts

## Troubleshooting

### Common Issues

**Issue**: "Inventory account not found"
**Solution**: Ensure a Stock type account exists in the chart of accounts

**Issue**: "No default warehouse found"
**Solution**: Create at least one warehouse and mark it as default

**Issue**: "Cannot disable inventory tracking"
**Solution**: Inventory tracking cannot be disabled after transactions exist

**Issue**: FIFO calculation seems incorrect
**Solution**: Verify layer creation dates and quantities in inventory_layers table

### Debug Queries

```sql
-- Check inventory layers for an item
SELECT * FROM inventory_layers WHERE itemId = 'item-id' ORDER BY createdAt;

-- Check inventory movements
SELECT * FROM inventory_movements WHERE itemId = 'item-id' ORDER BY createdAt DESC;

-- Verify journal entries
SELECT * FROM journals j 
JOIN journal_entries je ON j.id = je.journalId 
WHERE j.reference LIKE '%inventory%';
```

## Support

For technical support or questions:
1. Check the troubleshooting section above
2. Review the test files for usage examples
3. Examine the inventory service code for implementation details
4. Refer to the acceptance checklist for validation criteria

## Version History

- **v1.0** (January 2025): Initial implementation with complete FIFO inventory tracking
  - Database schema design and migration
  - Core inventory service with FIFO processing
  - API endpoints for inventory management
  - Frontend UI for item management and opening balances
  - Double-entry accounting integration
  - Comprehensive test suite

---

**Last Updated**: January 22, 2025  
**Version**: 1.0  
**Status**: Production Ready
