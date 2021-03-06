drop table if exists oauth2_access_tokens cascade;
drop table if exists oauth2_auth_codes cascade;
drop table if exists users cascade;
drop table if exists oauth2_clients cascade;

create table users (
    id integer auto_increment primary key,
    username varchar(255) unique not null,
    human_name tinytext default null collate utf8_general_ci,
    google_id varchar(255) unique default null,
    facebook_id varchar(255) unique default null,
    password varchar(255) default null,
    salt char(64) default null,
    cloud_id char(64) unique not null,
    auth_token char(64) not null,
    constraint password_salt check ((password is not null and salt is not null) or
                                    (password is null and salt is null)),
    constraint auth_method check (password is not null or google_id is not null or facebook_id is not null)
) collate = utf8_bin ;

create table oauth2_clients (
    id char(64) primary key,
    secret char(64) not null,
    magic_power boolean not null default false
) collate = utf8_bin ;

create table oauth2_access_tokens (
    user_id integer,
    client_id char(64),
    token char(64) not null,
    primary key (user_id, client_id),
    unique key (token),
    foreign key (user_id) references users(id) on update cascade on delete cascade,
    foreign key (client_id) references oauth2_clients(id) on update cascade on delete cascade
) collate = utf8_bin;

create table oauth2_auth_codes (
    user_id integer,
    client_id char(64),
    code char(64),
    redirectURI tinytext,
    primary key (user_id, client_id),
    key (code),
    foreign key (user_id) references users(id) on update cascade on delete cascade,
    foreign key (client_id) references oauth2_clients(id) on update cascade on delete cascade
) collate = utf8_bin;
