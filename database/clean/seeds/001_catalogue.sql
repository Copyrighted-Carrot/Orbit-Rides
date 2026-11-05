-- Curated demo fleet. Run with SET LOCAL orbit.demo_seed = 'enabled' in a transaction.
-- Rates are illustrative INR minor units. A model is represented by one demo fleet unit.
do $$ begin
 if current_setting('orbit.demo_seed',true) is distinct from 'enabled' then raise exception 'Demo seed must be enabled explicitly'; end if;
end $$;
insert into public.vehicle_types(name) values ('Coupe'),('Sedan'),('SUV'),('Convertible')
on conflict(name) do nothing;
insert into public.vehicles(fleet_code,manufacturer,model,vehicle_type_id,daily_rate_minor,published)
select v.code,v.make,v.model,t.id,v.rate,true from (values
 ('DEMO-01','BMW','M4 Competition','Coupe',350000),
 ('DEMO-02','Mercedes-Benz','AMG GT 63','Coupe',450000),
 ('DEMO-03','Porsche','911 Turbo S','Coupe',600000),
 ('DEMO-04','Tesla','Model S Plaid','Sedan',380000),
 ('DEMO-05','Lamborghini','Huracán EVO','Coupe',850000),
 ('DEMO-06','Audi','RS e-tron GT','Sedan',360000),
 ('DEMO-07','Land Rover','Range Rover Autobiography','SUV',420000),
 ('DEMO-08','Ferrari','Roma','Coupe',750000),
 ('DEMO-09','Rolls-Royce','Ghost','Sedan',950000),
 ('DEMO-10','McLaren','720S Spider','Convertible',800000),
 ('DEMO-11','Bentley','Continental GT Speed','Coupe',550000)
) v(code,make,model,body,rate) join public.vehicle_types t on t.name=v.body
on conflict(fleet_code) do nothing;

