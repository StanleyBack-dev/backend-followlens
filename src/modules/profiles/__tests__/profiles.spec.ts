import type {
  ProfileRepositoryPort,
  ProfileView,
} from "@/modules/profiles/application/ports/profile-repository.port";
import { ProfileAccessService } from "@/modules/profiles/application/profile-access.service";
import { ManageProfilesUseCase } from "@/modules/profiles/application/use-cases/manage-profiles.use-case";

const USER = "user-1";
const FREE = { id: USER, pro: false };
const PRO = { id: USER, pro: true };
const limits = {
  freeImportIntervalDays: 7,
  freeHistoryDays: 30,
  freeProfiles: 1,
  proProfiles: 3,
};
const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

function setup(count: number) {
  let rows: ProfileView[] = Array.from({ length: count }, (_, i) => ({
    id: ID(i + 1),
    userId: USER,
    name: `perfil ${i + 1}`,
    isDefault: i === 0,
    createdAt: new Date(2026, 0, i + 1),
  }));
  const repository = {
    listByUser: jest.fn(async () => rows),
    ensureDefault: jest.fn(async (userId: string, name: string) => {
      rows = [
        { id: ID(1), userId, name, isDefault: true, createdAt: new Date() },
      ];
    }),
    create: jest.fn(async (userId: string, name: string) => {
      const row = {
        id: ID(rows.length + 1),
        userId,
        name,
        isDefault: false,
        createdAt: new Date(),
      };
      rows = [...rows, row];
      return row;
    }),
    rename: jest.fn(async () => null),
    delete: jest.fn(async (_userId: string, id: string) => {
      rows = rows.filter((row) => row.id !== id);
    }),
  } as unknown as ProfileRepositoryPort & Record<string, jest.Mock>;
  const access = new ProfileAccessService(repository, limits);
  return {
    repository,
    access,
    manage: new ManageProfilesUseCase(repository, access),
  };
}

describe("profiles", () => {
  it("creates the default profile the first time a user needs one", async () => {
    const { access, repository } = setup(0);

    const profile = await access.resolve(FREE, undefined);

    expect(repository.ensureDefault).toHaveBeenCalledWith(
      USER,
      "Perfil principal",
    );
    expect(profile.isDefault).toBe(true);
  });

  it("acts on the selected profile when it belongs to the user", async () => {
    const { access } = setup(3);

    expect((await access.resolve(PRO, ID(2))).id).toBe(ID(2));
    // Unknown, malformed or someone else's id falls back to the default.
    expect((await access.resolve(PRO, ID(9))).id).toBe(ID(1));
    expect((await access.resolve(PRO, "not-a-uuid")).id).toBe(ID(1));
  });

  it("locks the profiles over the limit after a downgrade", async () => {
    const { access } = setup(3);

    const { profiles, limit } = await access.list(FREE);

    expect(limit).toBe(1);
    expect(profiles.map((profile) => profile.locked)).toEqual([
      false,
      true,
      true,
    ]);
    // A locked profile can't be selected: the default is used instead.
    expect((await access.resolve(FREE, ID(2))).id).toBe(ID(1));
  });

  it("stops a Free user at one profile and a Pro user at three", async () => {
    await expect(setup(1).manage.create(FREE, "outro")).rejects.toMatchObject({
      response: { code: "PROFILE_LIMIT_REACHED" },
    });

    const pro = setup(2);
    expect((await pro.manage.create(PRO, "terceiro")).profiles).toHaveLength(3);
    await expect(pro.manage.create(PRO, "quarto")).rejects.toMatchObject({
      response: { code: "PROFILE_LIMIT_REACHED" },
    });
  });

  it("refuses to delete the default profile", async () => {
    const { manage, repository } = setup(2);

    await expect(manage.delete(PRO, ID(1))).rejects.toMatchObject({
      response: { code: "PROFILE_CANNOT_DELETE_DEFAULT" },
    });
    expect(repository.delete).not.toHaveBeenCalled();

    expect((await manage.delete(PRO, ID(2))).profiles).toHaveLength(1);
  });
});
