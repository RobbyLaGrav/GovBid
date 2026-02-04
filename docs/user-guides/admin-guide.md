# GovBid Pro Admin Guide

This guide is for system administrators who manage tenant settings, security, and integrations.

## Tenant Configuration

1. **Company Profile**
   - Legal entity name
   - Primary address
   - Tax identifiers
2. **Billing**
   - Default subscription plan
   - Invoice recipients
   - Payment method validation

## User Management

- **Role Definitions**: Admin, Manager, Contributor, Viewer.
- **Approval Rules**: Require Admin approval for final submissions.
- **Access Reviews**: Quarterly audits for inactive users.

## Security Settings

- **Password Policy**: 12+ characters, rotation every 90 days.
- **MFA**: Required for Admins, optional for others.
- **SSO**: SAML/OIDC configuration when enabled.

## Data Governance

- **Retention**: Proposal drafts retained for 24 months by default.
- **Exports**: Track CSV/Excel exports in audit logs.
- **PII Masking**: Enable for report exports.

## Integrations

- **Email**: SMTP or transactional provider settings.
- **Calendar**: Google and Microsoft OAuth credentials.
- **Payments**: Stripe keys and webhook URLs.

## Monitoring & Alerts

- **Health Checks**: `/api/health` for backend and `/metrics` for observability.
- **Usage Analytics**: View daily active users and API usage.
- **Incident Response**: Configure escalation policies.

## Troubleshooting

- **Login issues**: Confirm SSO metadata or password reset flow.
- **Data sync delays**: Check queue workers and scraper schedules.
- **Missing alerts**: Validate notification preferences and SMTP settings.
