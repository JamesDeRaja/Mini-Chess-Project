type InvitePanelProps = {
  inviteLink: string;
  onCopy: () => void;
};

export function InvitePanel({ inviteLink, onCopy }: InvitePanelProps) {
  return (
    <section className="invite-panel">
      <h2>Invite link</h2>
      <p>Share this URL with another player. The first visitor is White, the second is Black, and later visitors spectate.</p>
      <div className="invite-row">
        <input readOnly value={inviteLink} />
        <button onClick={onCopy}>Copy Invite Link</button>
      </div>
    </section>
  );
}
