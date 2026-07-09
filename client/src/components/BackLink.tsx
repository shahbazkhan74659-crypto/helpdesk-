import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type BackLinkProps = {
  to: string;
  label: string;
};

function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link to={to} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  );
}

export default BackLink;
