interface UniversalShardIconProps {
  className?: string;
}

export function UniversalShardIcon({ className }: UniversalShardIconProps) {
  return (
    <span className={`inventory-universal-shard-icon${className ? ` ${className}` : ''}`}>
      汎
    </span>
  );
}
