import { cleanoxOperationalConfig } from "./cleanox";
import { ikmOperationalConfig } from "./ikm";
import { waschenOperationalConfig } from "./waschen";

const auroraOperationalConfig = {
  ...ikmOperationalConfig,
  id: "aurora",
  companyIds: [4],
};

const fallbackOperationalConfig = {
  ...ikmOperationalConfig,
  id: "default",
};

function getLogoSrc(company) {
  const companyId = Number(company?.company_id);
  if (companyId === 5) return "/waschen.webp";
  if (companyId === 2) return "/ikm.png";
  if (companyId === 3) return "/cleanox.png";
  if (companyId === 4) return "/aurora.png";
  if (companyId === 1) return "/alora2.png";
  return "/alora.png";
}

export function getOperationalCompanyConfig(company) {
  const companyId = Number(company?.company_id);

  let config = fallbackOperationalConfig;
  if (waschenOperationalConfig.companyIds.includes(companyId)) config = waschenOperationalConfig;
  else if (cleanoxOperationalConfig.companyIds.includes(companyId)) config = cleanoxOperationalConfig;
  else if (auroraOperationalConfig.companyIds.includes(companyId)) config = auroraOperationalConfig;
  else if (ikmOperationalConfig.companyIds.includes(companyId)) config = ikmOperationalConfig;

  return {
    ...config,
    logoSrc: getLogoSrc(company),
  };
}

export { cleanoxOperationalConfig, ikmOperationalConfig, waschenOperationalConfig };
