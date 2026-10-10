# CRM Sales Management System

## Project Overview

The CRM Sales Management System is a backend application designed to manage leads, customers, deals, users, and sales activities.

It provides RESTful APIs for user authentication, lead management, customer management, deal tracking, activity management, timeline tracking, and sales analytics.

## Technologies Used

- **Node.js** — JavaScript runtime
- **Express.js** — Backend framework
- **MongoDB** — NoSQL database
- **Mongoose** — MongoDB object modeling
- **JWT** — Authentication
- **bcryptjs** — Password hashing
- **express-validator** — Request validation



## Installation and Setup

### 1. Clone the Repository


git clone https://github.com/biswaranjan-bhuyan312/crm-sales-management.git
cd crm-sales-management

### 2. Install Dependencies

npm install

### 3. Configure Environment Variables

Create a `.env` file in the project root directory.

Add the following environment variables:

PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key

Replace the placeholder values with your actual configuration. Do not upload your `.env` file or expose your database credentials.

### 4. Run the Application

Use the command configured in your `package.json` to start the server.

For example, if your project uses the `start` script:

npm start

For development, if your project uses the `dev` script:

npm run dev


## Authentication and Authorization

The application uses JSON Web Tokens (JWT) to authenticate users.

### Authentication

1. Register a user through the registration API.
2. Log in using the registered credentials.
3. Use the generated JWT token to access protected endpoints.
4. Include the token in the `Authorization` header for protected requests.

Example:

Authorization: Bearer <your_jwt_token>

### Authorization

Protected routes use authentication middleware and role-based authorization middleware to control access to resources.

The permitted actions depend on the user's role and the authorization rules configured for each endpoint.

### Logout

The application includes a token blacklist model for handling logged-out tokens. A blacklisted token should no longer be accepted by the authentication middleware.


## API Endpoints

### Authentication APIs

| Method | Endpoint          | Purpose                       | Authentication |
|--------|-------------------|-------------------------------|----------------|
| POST | `/api/auth/register`| Register a new user           | No             |
| POST | `/api/auth/login`   | Log in a user                 | No             |
| GET  | `/api/auth/me`      | Get the current user's details| Yes            |
| POST | `/api/auth/logout`  | Log out the current user      | Yes            |

**Note:** These are the route paths defined in `authRoute.js`. The complete URLs depend on the prefix configured in `src/app.js`.


### Lead Management APIs

Base path: `/api/leads`

All endpoints require a valid JWT token.

| Method | Endpoint                 | Purpose                        | Allowed Roles                        |
|--------|--------------------------|--------------------------------|--------------------------------------|
| POST   | `/api/leads/create-lead` | Create a lead                  | Admin, Sales Manager                 |
| GET    | `/api/leads`             | Get the list of leads          | Admin, Sales Manager, Sales Executive|
| GET    | `/api/leads/:id`         | Get a lead by ID               | Admin, Sales Manager                 |
| PUT    | `/api/leads/:id`         | Update a lead                  | Admin, Sales Manager                 |
| PATCH  | `/api/leads/:id/status`  | Update lead status             | Admin, Sales Manager                 |
| PATCH  | `/api/leads/:id/assign`  | Assign a lead                  | Admin, Sales Manager                 |
| GET    | `/api/leads/:id/timeline`| Get a lead's timeline          | Admin, Sales Manager                 |
| DELETE | `/api/leads/:id`         | Delete a lead                  | Admin, Sales Manager                 |
| POST   | `/api/leads/:id/convert` | Convert a lead into a customer | Admin, Sales Manager, Sales Executive|



### Customer Management APIs

Base path: `/api/customers`

All endpoints require a valid JWT token.

| Method | Endpoint                         | Purpose              |
|--------|----------------------------------|----------------------|
| GET    | `/api/customers`                 | Get all customers    |
| GET    | `/api/customers/:id`             | Get a customer by ID |
| POST   | `/api/customers/create-customer` | Create a customer    |
| PUT    | `/api/customers/:id`             | Update a customer    |
| DELETE | `/api/customers/:id`             | Delete a customer    |

**Note:** The current customer routes use authentication middleware but do not specify role-based authorization middleware at the route level.


### Deal Management APIs

Base path: `/api/deals`

All endpoints require a valid JWT token.

| Method | Endpoint         | Purpose          |
|--------|------------------|------------------|
| GET    | `/api/deals`     | Get all deals    |
| GET    | `/api/deals/:id` | Get a deal by ID |
| PATCH  | `/api/deals/:id` | Update a deal    |

**Note:** These routes use authentication middleware but do not specify role-based authorization middleware at the route level.


### Activity Management APIs

Base path: `/api/activities`

All endpoints require a valid JWT token.

| Method | Endpoint                       | Purpose                      |
|--------|--------------------------------|------------------------------|
| POST   | `/api/activities`              | Create an activity           |
| GET    | `/api/activities`              | Get all activities           |
| GET    | `/api/activities/:id`          | Get an activity by ID        |
| PATCH  | `/api/activities/:id`          | Update an activity           |
| PATCH  | `/api/activities/:id/complete` | Mark an activity as completed|
| DELETE | `/api/activities/:id`          | Delete an activity           |

**Note:** These routes use authentication middleware but do not specify role-based authorization middleware at the route level.

### Timeline API

Base path: `/api/timeline`

All endpoints require a valid JWT token.

| Method | Endpoint                              | Purpose                                 |
|--------|---------------------------------------|-----------------------------------------|
| GET    | `/api/timeline/:entityType/:entityId` | Get the timeline for a specified entity |

**Parameters:**
- `entityType` — the type of entity whose timeline is requested.
- `entityId` — the ID of that entity.

### Sales Analytics API

Base path: `/api/analytics`

All endpoints require a valid JWT token.

| Method | Endpoint         | Purpose                  |
|--------|------------------|--------------------------|
| GET    | `/api/analytics` | Retrieve sales analytics |

**Note:** The route uses authentication middleware but does not specify role-based authorization middleware at the route level.


### User Management APIs

Base path: `/api/users`

All endpoints require a valid JWT token and the **Admin** role.

| Method | Endpoint                 | Purpose             |
|--------|--------------------------|---------------------|
| POST   | `/api/users/create-user` | Create a new user   |
| GET    | `/api/users`             | Get all users       |
| GET    | `/api/users/:id`         | Get a user by ID    |
| PATCH  | `/api/users/:id`         | Update user details |
| PATCH  | `/api/users/:id/status`  | Update user status  |
| DELETE | `/api/users/:id`         | Delete a user       |



## Database Design

MongoDB collections are represented by Mongoose models in `src/models`.

### User

Stores user accounts and roles.

- Fields: `name`, `email`, `phone`, `password`, `role`, `status`
- Roles: `Admin`, `Sales Manager`, `Sales Executive`
- Status: `active`, `inactive`
- Password is excluded from normal query results using `select: false`.
- Indexes: unique `email`, unique `phone`, `role`, descending `createdAt`.

### Lead

Stores potential customers.

- Fields: `name`, `email`, `phone`, `company`, `source`, `status`, `priority`, `assignedTo`, `description`
- `assignedTo` references a `User`.
- Sources: Website, Referral, Social Media, Email, Phone, Other.
- Statuses: New, Contacted, Qualified, Unqualified, Converted, Lost.
- Priorities: Low, Medium, High.
- Indexes: `status`, `source`, `assignedTo`, descending `createdAt`.

### Customer

Stores customer information.

- Fields: `name`, `email`, `phone`, `company`, `address`, `originalLead`, `assignedTo`, `status`
- `originalLead` references a `Lead` and is unique, allowing no more than one customer record per original lead.
- `assignedTo` references a `User`.
- Indexes: `name`, `phone`, unique `originalLead`.

### Deal

Stores sales opportunities.

- Fields: `name`, `lead`, `customer`, `assignedTo`, `dealValue`, `probability`, `expectedRevenue`, `expectedClosingDate`, `stage`, `description`, `lostReason`
- `lead` references a `Lead`; `customer` references a `Customer`; `assignedTo` references a `User`.
- `dealValue` must be greater than zero. `probability` ranges from 0 to 100.
- Stages: Qualification, Discovery, Proposal, Negotiation, Won, Lost.
- `expectedRevenue` defaults to `dealValue * probability / 100` when the document is created.
- Indexes: `lead`, `customer`, `assignedTo`, `stage`, `expectedClosingDate`.

### Activity

Stores tasks and sales activities.

- Fields: `type`, `title`, `description`, `assignedTo`, `dueDate`, `status`, `relatedEntityType`, `relatedEntityId`, `createdBy`, `completedAt`
- `assignedTo` and `createdBy` reference `User`.
- Supported types: Call, Email, Meeting, Demo, Follow-up, Reminder, Note.
- Statuses: Pending, Completed, Overdue.
- Related entity types: Lead, Customer, Deal, User.
- Indexes: compound `assignedTo` + `status`, compound `dueDate` + `status`, compound `relatedEntityType` + `relatedEntityId`.

### Timeline

Stores events related to CRM entities.

- Fields: `action`, `entityType`, `entityId`, `performedBy`, `previousValue`, `newValue`, `description`
- `performedBy` references `User`.
- Entity types: Lead, Customer, Deal.
- Indexes: compound `entityType` + `entityId` + descending `createdAt`; compound `performedBy` + descending `createdAt`.

### Blacklisted Token

Stores tokens invalidated by logout.

- Fields: `token`, `expiresAt`
- `token` is unique.
- `expiresAt` has a MongoDB TTL index so expired records can be removed automatically.

All schemas include Mongoose timestamps unless otherwise configured.

## Business Rules and Security

- Protected endpoints require a valid JWT in the `Authorization` header.
- JWT verification checks token signature and expiration.
- Requests using a blacklisted token are rejected.
- Inactive users cannot authenticate successfully.
- Passwords are hashed using `bcryptjs` with 10 salt rounds.
- User management routes are restricted to Admin.
- Lead routes use role-based authorization as shown in the endpoint table.
- A customer record references its original lead, and that reference is unique.
- The API uses Helmet, CORS, JSON request parsing, and a rate limit of 100 requests per 15-minute window.
- Request validation is used on registration and login routes.
- Error responses generally include `success: false` and a message.

## Error Response Examples

Example authentication error:

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

Example rate-limit error:

```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

HTTP status codes used by the API include `200`, `201`, `400`, `401`, `403`, `404`, `409`, and `500`, depending on the endpoint and error.

## Project Structure

```text
crm-sales-management/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── validators/
│   ├── app.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## API Testing

You can test the endpoints using Postman or another HTTP client.

1. Start the server.
2. Register or log in to obtain a JWT.
3. For protected requests, set `Authorization` to `Bearer <jwt_token>`.
4. Send JSON request bodies with `Content-Type: application/json` where required.
5. Check the HTTP status and JSON response.

A Postman collection or Swagger/OpenAPI specification should be maintained alongside this README as the API documentation deliverable.

## Assumptions and Notes

- The API uses MongoDB through Mongoose.
- The local example base URL is `http://localhost:5000`.
- Role permissions in this document reflect the route definitions reviewed for this project; endpoints that only use authentication are not described as role-restricted.
- The request bodies for customer, deal, activity, and analytics endpoints can vary by controller validation and should be checked against the implementation when creating a formal API collection.
- Public registration currently accepts any of the three supported roles. Before public deployment, restrict who can create Admin accounts or change the registration role behavior.

## License

Add the license and usage terms here if the project is published under a specific license.
