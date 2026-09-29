REVOKE EXECUTE ON FUNCTION public.can_access_chart(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finalize_appointment(uuid, text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_chart(uuid) TO authenticated;