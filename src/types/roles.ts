/**
 * Role-management action data shapes — declared here (not in the roles
 * plugin's action files) so the typed `getChaiBuilder` instance API can
 * reference them without importing plugin code.
 */

/** A row of the `roles` table as returned by the role CRUD actions. */
export type RoleEntry = {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
};

export type GetRoleActionData = {
  name: string;
};

export type CreateRoleActionData = {
  name: string;
  permissions: string[];
};

export type UpdateRoleActionData = {
  name: string;
  permissions: string[];
};

export type DeleteRoleActionData = {
  name: string;
};
