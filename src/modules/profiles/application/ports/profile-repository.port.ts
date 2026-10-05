export type ProfileView = {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
};

export interface ProfileRepositoryPort {
  findById(profileId: string): Promise<ProfileView | null>;
  /** The user's profiles, default first, then oldest first. */
  listByUser(userId: string): Promise<ProfileView[]>;
  /** Creates the user's default profile unless it already exists. */
  ensureDefault(userId: string, name: string): Promise<void>;
  create(userId: string, name: string): Promise<ProfileView>;
  /** @returns null when the profile isn't the user's. */
  rename(
    userId: string,
    profileId: string,
    name: string,
  ): Promise<ProfileView | null>;
  /** Removes the profile and, by cascade, all of its follower data. */
  delete(userId: string, profileId: string): Promise<void>;
}

export const PROFILE_REPOSITORY = Symbol("PROFILE_REPOSITORY");
