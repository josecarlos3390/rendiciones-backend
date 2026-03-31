import { SetMetadata } from '@nestjs/common';

export const REQUIRE_CONF_KEY = 'requireConf';
/** Marca un endpoint como requiriendo appConf = 'Y' en el JWT */
export const RequiereConf = () => SetMetadata(REQUIRE_CONF_KEY, true);