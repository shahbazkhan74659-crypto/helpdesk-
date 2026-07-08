import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Role } from '../lib/role';

const SKELETON_ROWS = 3;

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

type UsersTableProps = {
  users: User[] | undefined;
  isPending: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
};

function UsersTable({ users, isPending, onEdit, onDelete }: UsersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending
          ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-14" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell />
              </TableRow>
            ))
          : (users ?? []).map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.role === Role.admin ? (
                    <Badge className="capitalize">{user.role}</Badge>
                  ) : (
                    <span className="capitalize">{user.role}</span>
                  )}
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${user.name}`}
                    onClick={() => onEdit(user)}
                  >
                    <Pencil />
                  </Button>
                  {user.role !== Role.admin && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${user.name}`}
                      onClick={() => onDelete(user)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}

export default UsersTable;
