// src/components/admin/UserTable.tsx
import React, { useMemo } from "react";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import type { AdminUser, Section } from "../../types";
import EnhancedUserEditor from "./EnhancedUserEditor";
import DataTable from "../ui/DataTable";

interface UserTableProps {
  users: AdminUser[];
}

const UserTable: React.FC<UserTableProps> = ({ users }) => {
  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        id: "expander",
        header: () => null,
        cell: ({ row }) => (
          <button
            onClick={row.getToggleExpandedHandler()}
            className="p-1 transition-transform duration-200"
            style={{ transform: row.getIsExpanded() ? "rotate(90deg)" : "" }}
          >
            <ChevronRight size={20} />
          </button>
        ),
      },
      {
        accessorKey: "username",
        header: "Username",
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        id: "modelCount",
        header: "Models",
        cell: ({ row }) => {
          const user = row.original;
          let sections: Section[] = [];
          try {
            sections = user.dashboard_content
              ? JSON.parse(user.dashboard_content)
              : [];
          } catch {
            sections = [];
          }
          const modelCount = sections.filter(
            (s: Section) => s.type === "model",
          ).length;
          return `${modelCount} / ${user.max_models}`;
        },
      },
      {
        accessorKey: "last_login",
        header: "Last Login",
        cell: ({ row }) =>
          row.original.last_login
            ? new Date(row.original.last_login).toLocaleString()
            : "Never",
      },
    ],
    [],
  );

  return (
    <DataTable
      data={users}
      columns={columns}
      initialPageSize={10}
      renderExpandedRow={(row: Row<AdminUser>) => (
        <EnhancedUserEditor user={row.original} />
      )}
    />
  );
};

export default UserTable;
