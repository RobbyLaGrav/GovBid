# API Design

The GovBid Pro API follows REST conventions with JSON payloads and token-based authentication.

## Standards

- **Base URL**: `/api`
- **Authentication**: Bearer JWT
- **Response Format**: JSON with `data` and `meta` where applicable
- **Errors**: `{ error: { message, code, details } }`

## Example Endpoints

### Auth

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Contracts

- `GET /api/contracts`
- `GET /api/contracts/:id`
- `POST /api/contracts/search`

### Bids

- `GET /api/bids`
- `POST /api/bids`
- `POST /api/bids/:id/submit`

### Analytics

- `GET /api/analytics/overview`
- `GET /api/analytics/win-rate`

## Pagination

Standard query parameters:

- `page`
- `pageSize`
- `sort`

## Webhooks

- `POST /api/webhooks/stripe`

## Rate Limiting

Default limits: 60 requests per minute per user.
