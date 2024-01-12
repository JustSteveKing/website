import {
  UTM_CAMPAIGN,
  UTM_MEDIUM,
  UTM_SOURCE,
} from "./../config";

export const share = (url: string, type: string, term: string): string => {
  return `${url}?utm_campaign=${UTM_CAMPAIGN}&utm_medium=${UTM_MEDIUM}&utm_source=${UTM_SOURCE}&utm_type=${type}&utm_term=${term}`;
};