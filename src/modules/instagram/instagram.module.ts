import { Module } from "@nestjs/common";
import { INSTAGRAM_GATEWAY } from "@/modules/instagram/application/ports/instagram-gateway.port";
import { InstagramWebApiAdapter } from "@/modules/instagram/infrastructure/http/instagram-web-api.adapter";

@Module({
  providers: [{ provide: INSTAGRAM_GATEWAY, useClass: InstagramWebApiAdapter }],
  exports: [INSTAGRAM_GATEWAY],
})
export class InstagramModule {}
