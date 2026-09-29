REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_dentist_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_patient_by_cpf(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_stock_alerts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_dentist_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_patient_by_cpf(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_stock_alerts() TO authenticated;