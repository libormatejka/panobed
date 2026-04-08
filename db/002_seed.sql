-- Pan Oběd – seed data pro POC (Pardubice)

INSERT INTO cities (name, slug) VALUES ('Pardubice', 'pardubice');

INSERT INTO restaurants (name, address, city_id, phone, website) VALUES
  ('Restaurace U Koruny',    'Náměstí Republiky 12, Pardubice',  1, '466 123 456', NULL),
  ('Pivovarský klub',        'Pernštýnské náměstí 5, Pardubice', 1, '466 234 567', NULL),
  ('Bistro Na Zámku',        'Zámecká 3, Pardubice',             1, NULL,          NULL),
  ('Café Rossini',           'Třída Míru 28, Pardubice',         1, '466 345 678', NULL),
  ('Jídelna Zelený Stůl',    'Palackého 17, Pardubice',          1, '466 456 789', NULL);

-- Dnešní menu (2026-04-08)
INSERT INTO daily_menus (restaurant_id, date) VALUES (1, '2026-04-08');
INSERT INTO menu_items (daily_menu_id, name, price) VALUES
  (1, 'Gulášová polévka',              4500),
  (1, 'Svíčková na smetaně s knedlíkem', 15900),
  (1, 'Smažený řízek s bramborovým salátem', 14900),
  (1, 'Palačinka s marmeládou',        5900);

INSERT INTO daily_menus (restaurant_id, date) VALUES (2, '2026-04-08');
INSERT INTO menu_items (daily_menu_id, name, price) VALUES
  (2, 'Česnečka',                      3900),
  (2, 'Vepřová pečeně se zelím a knedlíkem', 13900),
  (2, 'Kuřecí steak s rýží',           14500),
  (2, 'Ovocný jogurt',                 4500);

INSERT INTO daily_menus (restaurant_id, date) VALUES (3, '2026-04-08');
INSERT INTO menu_items (daily_menu_id, name, price) VALUES
  (3, 'Rajská polévka s rýží',         4200),
  (3, 'Losos na másle s bramborovou kaší', 18900),
  (3, 'Těstoviny bolognese',           13500);

INSERT INTO daily_menus (restaurant_id, date) VALUES (4, '2026-04-08');
INSERT INTO menu_items (daily_menu_id, name, price) VALUES
  (4, 'Hovězí vývar s nudlemi',        4500),
  (4, 'Rizoto s kuřecím masem a parmazánem', 15500),
  (4, 'Vegetariánský wrap se zeleninou', 12900),
  (4, 'Tiramisu',                      6500);

INSERT INTO daily_menus (restaurant_id, date) VALUES (5, '2026-04-08');
INSERT INTO menu_items (daily_menu_id, name, price) VALUES
  (5, 'Zelná polévka',                 3500),
  (5, 'Vepřový řízek s bramborami',    11900),
  (5, 'Dušená kuřecí játra s rýží',    10900),
  (5, 'Ovocný salát',                  4900);

-- Zítřejší menu (2026-04-09)
INSERT INTO daily_menus (restaurant_id, date) VALUES (1, '2026-04-09');
INSERT INTO menu_items (daily_menu_id, name, price) VALUES
  (6, 'Hrachová polévka',              4500),
  (6, 'Pečená kachna s červeným zelím a bramborovým knedlíkem', 16900),
  (6, 'Grilovaný losos s bramborami',  17500);

INSERT INTO daily_menus (restaurant_id, date) VALUES (2, '2026-04-09');
INSERT INTO menu_items (daily_menu_id, name, price) VALUES
  (7, 'Kuřecí vývar se zeleninou',     4200),
  (7, 'Hovězí guláš s houskovým knedlíkem', 14900),
  (7, 'Zeleninové curry s rýží',       12900);
