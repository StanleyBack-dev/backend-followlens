import { HttpStatus } from "@nestjs/common";

export const followersErrors = {
  unknownFilterUser: {
    code: "FOLLOWERS_UNKNOWN_FILTER_USER",
    status: HttpStatus.BAD_REQUEST,
    message: "O seguidor selecionado no filtro não existe.",
  },
} as const;
