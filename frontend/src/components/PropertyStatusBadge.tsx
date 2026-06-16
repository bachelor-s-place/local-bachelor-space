import styles from "./PropertyStatusBadge.module.css";

export default function PropertyStatusBadge({ status }: { status: string }) {
  let badgeClass = styles.badgeDraft;
  let label = "Draft";

  switch (status) {
    case "pending_verification":
      badgeClass = styles.badgePending;
      label = "Verification Pending";
      break;
    case "verified":
      badgeClass = styles.badgeVerified;
      label = "Verified";
      break;
    case "occupied":
      badgeClass = styles.badgeOccupied;
      label = "Occupied";
      break;
    case "delisted":
      badgeClass = styles.badgeDelisted;
      label = "Delisted";
      break;
  }

  return (
    <span className={`${styles.badge} ${badgeClass}`}>
      {label}
    </span>
  );
}
