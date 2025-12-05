# Technical Page Descriptions

## 1. Employees Management Page
This page implements CRUD operations on the Firestore `employees` collection using Firebase SDK. It features role-based authentication middleware that validates user permissions before allowing data mutations. The interface performs real-time queries with client-side filtering, enabling search functionality through Firestore document retrieval and state management. Employee records are stored as Firestore documents with type-safe TypeScript interfaces, and the page handles document updates, deletions, and batch operations through Firebase Firestore API endpoints.

## 2. Sites Management Page with Employee Allocation Modal
This page manages site-employee relationships through Firestore's `siteEmployeeAllocations` collection. The modal implements a relational data model where site documents reference employee documents via foreign keys. It uses Firestore query constraints with `where` clauses to fetch allocations by site ID, enabling efficient data retrieval. The allocation creation process performs document writes to Firestore with transaction support, ensuring data consistency. The interface implements optimistic UI updates with error handling for failed Firestore operations.

## 3. Sites Management Page
This page provides CRUD operations for the Firestore `sites` collection, implementing a document-based data model. It uses Firestore query builders with `orderBy` constraints to sort site documents by creation timestamp. The page implements client-side search filtering on Firestore document arrays after initial collection retrieval. Site documents contain nested data structures for working days, rates, and frequency settings, stored as Firestore document fields. The interface handles document updates through Firestore's `updateDoc` API with partial update support.

## 4. User Management Page
This page manages Firebase Authentication users and their Firestore user documents, implementing role-based access control (RBAC). It enforces admin-only access through protected route middleware that validates user roles stored in Firestore documents. The page performs Firestore document updates to modify user roles and approval status, using Firebase Auth UID as document identifiers. It implements user approval workflows through Firestore document mutations, updating `approved` and `role` fields with timestamp tracking. The interface queries the `users` collection using Firestore `getDocs` to retrieve all user documents for display.

## 5. Clients Management Page
This page implements CRUD operations on the Firestore `clients` collection with type-safe data models. It performs Firestore collection queries with `orderBy` constraints to retrieve client documents sorted by creation date. The page implements client-side search functionality that filters Firestore document arrays based on multiple field criteria. Client documents are stored as Firestore documents with optional fields for company information and contact details. The interface handles document creation, updates, and deletions through Firebase Firestore SDK methods with error handling and toast notifications.

## 6. Salary Calculator Page
This page computes employee salaries by querying Firestore collections for employee pay rates and site allocations. It performs Firestore queries using `getEmployeePayRatesByEmployee` to retrieve pay rate documents filtered by employee ID. The calculator implements client-side computation logic that aggregates hourly rates, travel allowances, and hours worked from multiple Firestore documents. It uses React state management to track calculation results and performs real-time recalculation when input values change. The page validates data existence by checking Firestore query results before performing salary computations.






