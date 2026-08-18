create table if not exists trials (
  id text primary key,
  user_id text,
  mode text not null,
  partner_kind text not null,
  subject_persona text,
  status text not null default 'active',
  question_count integer not null default 0,
  guess text,
  confidence integer,
  reasoning text,
  correct boolean,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists trials_user_id_idx on trials (user_id);
create index if not exists trials_created_at_idx on trials (created_at desc);
create index if not exists trials_status_idx on trials (status);

create table if not exists trial_messages (
  id serial primary key,
  trial_id text not null references trials(id) on delete cascade,
  turn integer not null,
  speaker text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists trial_messages_trial_id_idx on trial_messages (trial_id);
