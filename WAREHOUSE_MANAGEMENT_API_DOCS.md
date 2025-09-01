# Warehouse Management API Documentation

## Overview

The Warehouse Management API provides comprehensive warehouse operations, inventory transfers, and branch integration for the OpenAccounting platform. All endpoints support FIFO-only inventory processing and maintain OpenAccounting compatibility.

## Authentication

All endpoints require authentication via Bearer token:

```
Authorization: Bearer <token>
```

## Base URL

```
http://localhost:3001/api
```

---

## Warehouse Management

### List Warehouses

Get all warehouses for the authenticated organization with optional filtering.

**Endpoint:** `GET /warehouses`

**Query Parameters:**
- `branchId` (string, optional): Filter by branch ID
- `isActive` (boolean, optional): Filter by active status
- `warehouseType` (string, optional): Filter by warehouse type
- `search` (string, optional): Search by name, code, or city

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "warehouse_123",
      "organizationId": "org_456",
      "branchId": "branch_789",
      "name": "Main Warehouse",
      "code": "MAIN001",
      "address": "123 Storage St",
      "city": "Yangon",
      "state": "Yangon Region",
      "postalCode": "11181",
      "country": "Myanmar",
      "phone": "+95-1-234567",
      "email": "warehouse@company.com",
      "managerName": "John Doe",
      "managerEmail": "john@company.com",
      "warehouseType": "standard",
      "capacity": 10000.00,
      "currentUtilization": 75.50,
      "isDefault": true,
      "isActive": true,
      "isPrimary": true,
      "allowNegativeInventory": false,
      "autoReorderEnabled": true,
      "costCenter": "CC001",
      "notes": "Main storage facility",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "branches": {
        "id": "branch_789",
        "name": "Head Office",
        "isDefault": true
      },
      "inventoryValue": 125000.00,
      "utilizationPercent": 75.50,
      "itemCount": 150,
      "movementCount": 1250,
      "userCount": 5
    }
  ]
}
```

### Get Warehouse Details

Get detailed information about a specific warehouse.

**Endpoint:** `GET /warehouses/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "warehouse_123",
    "organizationId": "org_456",
    "branchId": "branch_789",
    "name": "Main Warehouse",
    "code": "MAIN001",
    // ... all warehouse fields
    "branches": {
      "id": "branch_789",
      "name": "Head Office",
      "addressLine1": "123 Business St",
      "city": "Yangon",
      "isDefault": true
    },
    "warehouse_permissions": [
      {
        "id": "perm_123",
        "userId": "user_456",
        "permission": "full_access",
        "users": {
          "id": "user_456",
          "name": "Jane Smith",
          "email": "jane@company.com"
        }
      }
    ],
    "inventory_layers": [
      {
        "id": "layer_789",
        "itemId": "item_101",
        "quantityRemaining": 50.0000,
        "unitCost": 25.0000,
        "products": {
          "id": "item_101",
          "name": "Product A",
          "sku": "SKU001",
          "unit": "pcs"
        }
      }
    ],
    "inventoryValue": 125000.00,
    "utilizationPercent": 75.50
  }
}
```

### Create Warehouse

Create a new warehouse linked to a branch.

**Endpoint:** `POST /warehouses`

**Request Body:**
```json
{
  "branchId": "branch_789",
  "name": "Regional Warehouse",
  "code": "REG001",
  "address": "456 Storage Ave",
  "city": "Mandalay",
  "state": "Mandalay Region",
  "postalCode": "05011",
  "country": "Myanmar",
  "phone": "+95-2-345678",
  "email": "regional@company.com",
  "managerName": "Bob Wilson",
  "managerEmail": "bob@company.com",
  "warehouseType": "distribution",
  "capacity": 15000.00,
  "isPrimary": false,
  "allowNegativeInventory": false,
  "autoReorderEnabled": true,
  "costCenter": "CC002",
  "notes": "Regional distribution center"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "warehouse_new_123",
    "organizationId": "org_456",
    "branchId": "branch_789",
    "name": "Regional Warehouse",
    "code": "REG001",
    // ... all created fields
    "branches": {
      "id": "branch_789",
      "name": "Head Office",
      "isDefault": true
    }
  },
  "message": "Warehouse created successfully"
}
```

### Update Warehouse

Update warehouse information.

**Endpoint:** `PUT /warehouses/:id`

**Request Body:** (partial update supported)
```json
{
  "name": "Updated Warehouse Name",
  "capacity": 20000.00,
  "managerName": "New Manager",
  "notes": "Updated notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated warehouse object
  }
}
```

### Delete Warehouse

Delete a warehouse (only if no inventory exists).

**Endpoint:** `DELETE /warehouses/:id`

**Response:**
```json
{
  "success": true,
  "message": "Warehouse deleted successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Cannot delete warehouse with existing inventory or movements"
}
```

### Set Primary Warehouse

Set a warehouse as primary for its branch.

**Endpoint:** `PATCH /warehouses/:id/primary`

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated warehouse with isPrimary: true
  },
  "message": "Primary warehouse updated successfully"
}
```

### Toggle Warehouse Status

Activate or deactivate a warehouse.

**Endpoint:** `PATCH /warehouses/:id/status`

**Request Body:**
```json
{
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated warehouse
  },
  "message": "Warehouse deactivated successfully"
}
```

---

## Warehouse Permissions

### Get Warehouse Permissions

Get all permissions for a warehouse.

**Endpoint:** `GET /warehouses/:id/permissions`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "perm_123",
      "warehouseId": "warehouse_456",
      "userId": "user_789",
      "permission": "manage",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "users": {
        "id": "user_789",
        "name": "John Doe",
        "email": "john@company.com"
      }
    }
  ]
}
```

### Grant Warehouse Permission

Grant permission to a user for a warehouse.

**Endpoint:** `POST /warehouses/:id/permissions`

**Request Body:**
```json
{
  "userId": "user_789",
  "permission": "manage"
}
```

**Permission Types:**
- `view`: Read-only access
- `manage`: Create/update warehouse settings
- `transfer`: Create and manage transfers
- `adjust`: Perform inventory adjustments
- `full_access`: Complete warehouse control

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "perm_new_123",
    "warehouseId": "warehouse_456",
    "userId": "user_789",
    "permission": "manage",
    "users": {
      "id": "user_789",
      "name": "John Doe",
      "email": "john@company.com"
    }
  },
  "message": "Permission granted successfully"
}
```

### Revoke Warehouse Permission

Revoke all permissions for a user from a warehouse.

**Endpoint:** `DELETE /warehouses/:id/permissions/:userId`

**Response:**
```json
{
  "success": true,
  "message": "Permission revoked successfully"
}
```

---

## Warehouse Inventory

### Get Warehouse Inventory

Get current inventory levels for a warehouse.

**Endpoint:** `GET /warehouses/:id/inventory`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "product": {
        "id": "item_123",
        "name": "Product A",
        "sku": "SKU001",
        "unit": "pcs",
        "lowStockAlert": 10.0000
      },
      "totalQuantity": 150.0000,
      "totalValue": 7500.00,
      "averageCost": 50.00,
      "layers": [
        {
          "id": "layer_456",
          "quantityRemaining": 100.0000,
          "unitCost": 45.0000,
          "sourceType": "opening",
          "createdAt": "2024-01-01T00:00:00.000Z"
        },
        {
          "id": "layer_789",
          "quantityRemaining": 50.0000,
          "unitCost": 60.0000,
          "sourceType": "purchase",
          "createdAt": "2024-01-15T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

---

## Inventory Transfers

### List Inventory Transfers

Get all inventory transfers with optional filtering.

**Endpoint:** `GET /inventory-transfers`

**Query Parameters:**
- `status` (string, optional): Filter by status
- `fromWarehouseId` (string, optional): Filter by source warehouse
- `toWarehouseId` (string, optional): Filter by destination warehouse
- `dateFrom` (string, optional): Filter by date range start
- `dateTo` (string, optional): Filter by date range end

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "transfer_123",
      "organizationId": "org_456",
      "transferNumber": "TRF-2024-0001",
      "fromWarehouseId": "warehouse_789",
      "toWarehouseId": "warehouse_101",
      "status": "completed",
      "transferDate": "2024-01-15T00:00:00.000Z",
      "expectedDate": "2024-01-16T00:00:00.000Z",
      "completedDate": "2024-01-16T10:30:00.000Z",
      "notes": "Monthly stock redistribution",
      "totalValue": 5000.00,
      "journalId": "journal_456",
      "createdBy": "user_789",
      "approvedBy": "user_101",
      "createdAt": "2024-01-15T00:00:00.000Z",
      "from_warehouse": {
        "id": "warehouse_789",
        "name": "Main Warehouse",
        "code": "MAIN001"
      },
      "to_warehouse": {
        "id": "warehouse_101",
        "name": "Regional Warehouse",
        "code": "REG001"
      },
      "transfer_items": [
        {
          "id": "item_123",
          "itemId": "product_456",
          "quantity": 50.0000,
          "unitCost": 100.0000,
          "totalValue": 5000.00,
          "notes": "High priority items",
          "products": {
            "id": "product_456",
            "name": "Product B",
            "sku": "SKU002",
            "unit": "pcs"
          }
        }
      ],
      "journals": {
        "id": "journal_456",
        "journalNumber": "TRF-TRF-2024-0001",
        "status": "active"
      }
    }
  ]
}
```

### Get Transfer Details

Get detailed information about a specific transfer.

**Endpoint:** `GET /inventory-transfers/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transfer_123",
    "organizationId": "org_456",
    "transferNumber": "TRF-2024-0001",
    // ... all transfer fields
    "from_warehouse": {
      // Complete warehouse object
    },
    "to_warehouse": {
      // Complete warehouse object
    },
    "transfer_items": [
      {
        "id": "item_123",
        "transferId": "transfer_123",
        "itemId": "product_456",
        "quantity": 50.0000,
        "unitCost": 100.0000,
        "totalValue": 5000.00,
        "notes": "High priority items",
        "products": {
          // Complete product object
        }
      }
    ],
    "journals": {
      "id": "journal_456",
      "journalNumber": "TRF-TRF-2024-0001",
      "journalDate": "2024-01-15T00:00:00.000Z",
      "totalDebit": 5000.00,
      "totalCredit": 5000.00,
      "status": "active",
      "journal_entries": [
        {
          "id": "entry_789",
          "accountId": "account_101",
          "description": "Transfer out - Main Warehouse",
          "debitAmount": 0.00,
          "creditAmount": 5000.00,
          "ledger_accounts": {
            "id": "account_101",
            "name": "Inventory Asset",
            "code": "1300"
          }
        },
        {
          "id": "entry_102",
          "accountId": "account_101",
          "description": "Transfer in - Regional Warehouse",
          "debitAmount": 5000.00,
          "creditAmount": 0.00,
          "ledger_accounts": {
            "id": "account_101",
            "name": "Inventory Asset",
            "code": "1300"
          }
        }
      ]
    }
  }
}
```

### Create Inventory Transfer

Create a new inventory transfer between warehouses.

**Endpoint:** `POST /inventory-transfers`

**Request Body:**
```json
{
  "fromWarehouseId": "warehouse_789",
  "toWarehouseId": "warehouse_101",
  "transferDate": "2024-01-15T00:00:00.000Z",
  "expectedDate": "2024-01-16T00:00:00.000Z",
  "notes": "Monthly stock redistribution",
  "items": [
    {
      "itemId": "product_456",
      "quantity": 50,
      "notes": "High priority items"
    },
    {
      "itemId": "product_789",
      "quantity": 25,
      "notes": "Standard items"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transfer_new_123",
    "organizationId": "org_456",
    "transferNumber": "TRF-2024-0002",
    "status": "draft",
    // ... all created fields
    "transfer_items": [
      // Created transfer items with calculated costs
    ]
  },
  "message": "Transfer created successfully"
}
```

### Update Inventory Transfer

Update a draft transfer.

**Endpoint:** `PUT /inventory-transfers/:id`

**Request Body:** (partial update supported)
```json
{
  "expectedDate": "2024-01-17T00:00:00.000Z",
  "notes": "Updated transfer notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated transfer object
  },
  "message": "Transfer updated successfully"
}
```

### Delete Inventory Transfer

Delete a draft transfer.

**Endpoint:** `DELETE /inventory-transfers/:id`

**Response:**
```json
{
  "success": true,
  "message": "Transfer deleted successfully"
}
```

### Confirm Inventory Transfer

Confirm a draft transfer, processing inventory movement and creating journal entries.

**Endpoint:** `POST /inventory-transfers/:id/confirm`

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated transfer with status: "in_transit"
    // Includes journal entries
  },
  "message": "Transfer confirmed successfully"
}
```

### Complete Inventory Transfer

Mark an in-transit transfer as completed.

**Endpoint:** `POST /inventory-transfers/:id/complete`

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated transfer with status: "completed"
    // Includes completedDate
  },
  "message": "Transfer completed successfully"
}
```

### Cancel Inventory Transfer

Cancel a draft or in-transit transfer.

**Endpoint:** `POST /inventory-transfers/:id/cancel`

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated transfer with status: "cancelled"
  },
  "message": "Transfer cancelled successfully"
}
```

### Get Transfer Statistics

Get transfer statistics for dashboard/reporting.

**Endpoint:** `GET /inventory-transfers/stats`

**Query Parameters:**
- `dateFrom` (string, optional): Statistics date range start
- `dateTo` (string, optional): Statistics date range end

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTransfers": 150,
    "draftTransfers": 5,
    "inTransitTransfers": 12,
    "completedTransfers": 128,
    "totalValue": 250000.00
  }
}
```

---

## Branch-Warehouse Integration

### Get Branch Warehouses

Get all warehouses for a specific branch.

**Endpoint:** `GET /branches/:id/warehouses`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "warehouse_123",
      "organizationId": "org_456",
      "branchId": "branch_789",
      "name": "Main Warehouse",
      "code": "MAIN001",
      "isPrimary": true,
      "isActive": true,
      // ... other warehouse fields
      "_count": {
        "inventory_layers": 150
      }
    }
  ]
}
```

### Get Primary Warehouse

Get the primary warehouse for a branch.

**Endpoint:** `GET /branches/:id/primary-warehouse`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "warehouse_123",
    "organizationId": "org_456",
    "branchId": "branch_789",
    "name": "Main Warehouse",
    "code": "MAIN001",
    "isPrimary": true,
    "isActive": true
    // ... complete warehouse object
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

### Validation Error
```json
{
  "success": false,
  "error": "Warehouse name is required"
}
```

### Not Found Error
```json
{
  "success": false,
  "error": "Warehouse not found"
}
```

### Business Logic Error
```json
{
  "success": false,
  "error": "Cannot delete warehouse with existing inventory or movements"
}
```

### Permission Error
```json
{
  "success": false,
  "error": "Insufficient permissions to access this warehouse"
}
```

### Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Status Codes

- `200 OK`: Successful GET, PUT, PATCH requests
- `201 Created`: Successful POST requests
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Data Types

### Warehouse Types
- `standard`: General purpose warehouse
- `cold_storage`: Temperature controlled storage
- `hazmat`: Hazardous materials storage
- `distribution`: Distribution center
- `retail`: Retail location

### Transfer Status
- `draft`: Transfer created but not confirmed
- `pending_approval`: Awaiting approval (future feature)
- `approved`: Approved for processing (future feature)
- `in_transit`: Transfer confirmed and in progress
- `completed`: Transfer completed successfully
- `cancelled`: Transfer cancelled

### Permission Types
- `view`: Read-only access to warehouse data
- `manage`: Create/update warehouse settings
- `transfer`: Create and manage transfers
- `adjust`: Perform inventory adjustments
- `full_access`: Complete warehouse control

---

## Rate Limiting

API endpoints are subject to rate limiting:
- 1000 requests per hour per organization
- 100 requests per minute per user
- Transfer operations: 50 per hour per warehouse

---

## Changelog

### Version 1.0 (January 2025)
- Initial warehouse management API
- Complete CRUD operations
- Inventory transfer system
- Branch integration
- Permission management
- FIFO-only processing
- OpenAccounting alignment

---

**Last Updated**: January 23, 2025  
**API Version**: 1.0  
**Status**: Production Ready
