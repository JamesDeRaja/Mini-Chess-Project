type MoveHintProps = {
  isCapture: boolean;
};

export function MoveHint({ isCapture }: MoveHintProps) {
  return <span className={isCapture ? 'capture-dot' : 'move-dot'} aria-hidden="true" />;
}
