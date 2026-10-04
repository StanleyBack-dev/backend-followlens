import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { FollowerEventType } from "@/modules/followers/domain/enums/follower-event-type.enum";

// Append-only history of follow / unfollow changes, scoped to a profile.
@Entity("tb_follower_events")
@Index("IDX_follower_events_profile_type_occurred", [
  "profileId",
  "type",
  "occurredAt",
])
@Index("IDX_follower_events_profile_username", ["profileId", "username"])
export class FollowerEventOrmEntity {
  @PrimaryGeneratedColumn("uuid", { name: "idtb_follower_events" })
  id!: string;

  @Column({ name: "idtb_profiles", type: "uuid" })
  profileId!: string;

  @Column({ type: "varchar", length: 64 })
  username!: string;

  @Column({ type: "varchar", length: 16 })
  type!: FollowerEventType;

  @Column({ name: "idtb_imports", type: "uuid" })
  importId!: string;

  @Column({ name: "occurred_at", type: "timestamptz" })
  occurredAt!: Date;

  @Column({ name: "notified_at", type: "timestamptz", nullable: true })
  notifiedAt!: Date | null;
}
