type InvitePanelProps = {
  inviteLink: string | null;
  isLoading: boolean;
  isActive: boolean;
  copied: boolean;
  canNativeShare: boolean;
  compact?: boolean;
  onShare: () => void;
};

export function InvitePanel({ inviteLink, isLoading, isActive, copied, canNativeShare, compact = false, onShare }: InvitePanelProps) {
  const buttonLabel = copied
    ? 'Copied'
    : isLoading
      ? 'Creating link...'
      : canNativeShare
        ? isActive
          ? 'Share'
          : 'Share Invite'
        : isActive
          ? 'Share'
          : 'Copy Invite Link';

  if (isActive || compact) {
    return (
      <section className="invite-panel compact-invite-panel" aria-label="Invite link sharing">
        <button type="button" className="compact-action" onClick={onShare} disabled={!inviteLink || isLoading}>
          {buttonLabel}
        </button>
      </section>
    );
  }

  return (
    <section className="invite-panel compact-invite-card">
      <h2>Invite a friend</h2>
      <p>Send this link. First player is White, second player is Black.</p>
      <button type="button" onClick={onShare} disabled={!inviteLink || isLoading} aria-busy={isLoading}>
        {isLoading && <span className="button-spinner" aria-hidden="true" />}
        {buttonLabel}
      </button>
      <small>Extra visitors can spectate.</small>
    </section>
  );
}
