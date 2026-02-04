/* GovBid MongoDB initialization script */

const adminDb = db.getSiblingDB("admin");
const appDb = db.getSiblingDB("govbid");

const appUser = {
  user: "govbid_app",
  pwd: "CHANGEME",
  roles: [
    {
      role: "readWrite",
      db: "govbid"
    }
  ]
};

const analyticsUser = {
  user: "govbid_analytics",
  pwd: "CHANGEME",
  roles: [
    {
      role: "read",
      db: "govbid"
    }
  ]
};

const ensureUser = (userSpec) => {
  const existing = adminDb.getUsers().users.find((user) => user.user === userSpec.user);
  if (!existing) {
    adminDb.createUser(userSpec);
  }
};

ensureUser(appUser);
ensureUser(analyticsUser);

appDb.createCollection("audit_logs");
appDb.createCollection("contract_snapshots");
appDb.createCollection("notification_events");

appDb.audit_logs.createIndex({ createdAt: -1 });
appDb.contract_snapshots.createIndex({ externalId: 1 }, { unique: true });
appDb.notification_events.createIndex({ recipientId: 1, createdAt: -1 });

print("GovBid MongoDB initialization complete.");
