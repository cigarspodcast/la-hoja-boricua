/* LHB-56: GET /api/followers?handle=x&cursor=y → { people: [{handle, display_name, avatar_key}], next }. Pública; solo lo público de cada persona; un perfil oculto da 404. */
import { listResponse } from '../_lib/follow.js';

export const onRequestGet = ({ request, env }) => listResponse(request, env, 'followers');
