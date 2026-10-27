# MoHL server: serves the web app from ./mohl and a JSON API under /api.
# Content, accounts and sessions are stored in ./data/db.json (created from seed.json on first run).
# Run: ruby server.rb   (PORT env var overrides the default 5173)
require 'webrick'
require 'json'
require 'openssl'
require 'securerandom'
require 'fileutils'
require 'time'

ROOT = __dir__
DB_PATH = File.join(ROOT, 'data', 'db.json')
SEED_PATH = File.join(ROOT, 'seed.json')
LOCK = Mutex.new

# ---------- storage ----------
def load_db
  return JSON.parse(File.read(DB_PATH)) if File.exist?(DB_PATH)
  seed = JSON.parse(File.read(SEED_PATH))
  db = {
    'topics' => seed['topics'], 'courses' => seed['courses'], 'tools' => seed['tools'],
    'resources' => seed['resources'], 'posts' => seed['posts'], 'videos' => seed['videos'] || [],
    'users' => [], 'sessions' => {}
  }
  save_db(db)
  db
end

def save_db(db)
  FileUtils.mkdir_p(File.dirname(DB_PATH))
  tmp = "#{DB_PATH}.tmp"
  File.write(tmp, JSON.pretty_generate(db))
  File.rename(tmp, DB_PATH)
end

DB = load_db
# Databases created before the videos section existed start with the seed videos.
DB['videos'] ||= (JSON.parse(File.read(SEED_PATH))['videos'] || [])

# ---------- helpers ----------
class ApiError < StandardError
  attr_reader :status
  def initialize(status, msg)
    @status = status
    super(msg)
  end
end

def hash_password(password, salt = SecureRandom.hex(16))
  [salt, OpenSSL::PKCS5.pbkdf2_hmac(password, salt, 120_000, 32, 'sha256').unpack1('H*')]
end

def secure_eq(a, b)
  return false unless a.bytesize == b.bytesize
  a.bytes.zip(b.bytes).reduce(0) { |acc, (x, y)| acc | (x ^ y) }.zero?
end

def public_user(u)
  u && { 'id' => u['id'], 'name' => u['name'], 'email' => u['email'], 'role' => u['role'] }
end

def initials(name)
  name.split.map { |w| w[0] }.first(2).join.upcase
end

def slugify(text, list)
  base = text.to_s.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/^-|-$/, '')[0, 48]
  base = 'item' if base.empty?
  id = base
  id = "#{base}-#{SecureRandom.hex(2)}" while list.any? { |x| x['id'] == id }
  id
end

# Strip angle brackets from every string so stored content can never inject markup.
def clean(value)
  case value
  when String then value.gsub(/[<>]/, '').strip
  when Array then value.map { |v| clean(v) }
  when Hash then value.transform_values { |v| clean(v) }
  else value
  end
end

def require_str(h, key, label = key)
  v = h[key].to_s.strip
  raise ApiError.new(422, "#{label} is required") if v.empty?
  v
end

def url_or_blank(v, label)
  v = v.to_s.strip
  return '' if v.empty?
  raise ApiError.new(422, "#{label} must start with http:// or https://") unless v.match?(%r{\Ahttps?://\S+\z})
  v
end

def lines(v)
  (v.is_a?(Array) ? v : v.to_s.split("\n")).map(&:strip).reject(&:empty?)
end

def topic!(id)
  raise ApiError.new(422, 'Pick a valid topic') unless DB['topics'].any? { |t| t['id'] == id }
  id
end

# Whitelisted shape for each admin-editable collection.
def build_item(kind, b)
  case kind
  when 'tools'
    {
      'name' => require_str(b, 'name', 'Name'), 'topic' => topic!(b['topic']),
      'mono' => (b['mono'].to_s.strip.empty? ? initials(b['name']) : b['mono'].to_s.strip[0, 3]),
      'color' => (b['color'].to_s.match?(/\A#\h{6}\z/) ? b['color'] : '#B4501E'),
      'blurb' => require_str(b, 'blurb', 'Short description'), 'what' => b['what'].to_s,
      'course' => b['course'].to_s, 'resource' => b['resource'].to_s, 'guide' => lines(b['guide']),
      'url' => url_or_blank(b['url'], 'Website'), 'video' => url_or_blank(b['video'], 'Video URL')
    }
  when 'resources'
    {
      'title' => require_str(b, 'title', 'Title'), 'topic' => topic!(b['topic']),
      'type' => %w[Template Checklist Worksheet Guide].include?(b['type']) ? b['type'] : 'Template',
      'format' => %w[XLSX PDF DOCX].include?(b['format']) ? b['format'] : 'PDF',
      'blurb' => require_str(b, 'blurb', 'Short description'), 'illus' => b['illus'].to_s.empty? ? 'doc' : b['illus']
    }
  when 'courses'
    lessons = Array(b['lessons']).map do |l|
      ex = l['example'] || {}
      {
        'title' => require_str(l, 'title', 'Lesson title'), 'heading' => l['heading'].to_s, 'intro' => l['intro'].to_s,
        'video' => url_or_blank(l['video'], 'Lesson video URL'),
        'example' => { 'label' => ex['label'].to_s, 'title' => ex['title'].to_s, 'text' => ex['text'].to_s },
        'steps' => lines(l['steps']), 'yourTurn' => l['yourTurn'].to_s
      }
    end
    raise ApiError.new(422, 'A course needs at least one lesson') if lessons.empty?
    {
      'title' => require_str(b, 'title', 'Title'), 'topic' => topic!(b['topic']),
      'level' => %w[Beginner Intermediate Advanced].include?(b['level']) ? b['level'] : 'Beginner',
      'illus' => b['illus'].to_s.empty? ? 'measure' : b['illus'], 'blurb' => require_str(b, 'blurb', 'Short description'),
      'resource' => b['resource'].to_s, 'tool' => b['tool'].to_s, 'lessons' => lessons
    }
  when 'videos'
    url = url_or_blank(b['url'], 'Video link')
    raise ApiError.new(422, 'Video link is required') if url.empty?
    {
      'title' => require_str(b, 'title', 'Title'), 'url' => url, 'topic' => topic!(b['topic']),
      'tool' => b['tool'].to_s.strip, 'blurb' => b['blurb'].to_s.strip
    }
  when 'posts'
    {
      'title' => require_str(b, 'title', 'Title'), 'body' => require_str(b, 'body', 'Details'), 'topic' => topic!(b['topic']),
      'kind' => b['kind'] == 'Shared learning' ? 'Shared learning' : 'Question'
    }
  else
    raise ApiError.new(404, 'Unknown collection')
  end
end

PALETTE = [%w[#FCE3D2 #B4501E], %w[#E1E9FB #1F3A8A], %w[#DDF3E6 #1E7B43], %w[#EEE3FA #6B3FA0]].freeze

def new_post(fields, user)
  hue, ink = PALETTE.sample
  fields.merge('id' => "p#{SecureRandom.hex(4)}", 'author' => initials(user['name']), 'name' => user['name'],
               'userId' => user['id'], 'hue' => hue, 'ink' => ink, 'replies' => [], 'createdAt' => Time.now.utc.iso8601)
end

# ---------- API ----------
class Api < WEBrick::HTTPServlet::AbstractServlet
  COOKIE = 'mohl_session'

  %w[GET POST PUT DELETE].each do |m|
    define_method("do_#{m}") { |req, res| handle(req, res) }
  end

  def handle(req, res)
    res['Content-Type'] = 'application/json'
    res['Cache-Control'] = 'no-store'
    if req.request_method != 'GET' && !req.content_type.to_s.start_with?('application/json')
      raise ApiError.new(415, 'Send JSON')
    end
    body = req.body.to_s.empty? ? {} : JSON.parse(req.body)
    raise ApiError.new(400, 'Bad request') unless body.is_a?(Hash)
    out = LOCK.synchronize { route(req, res, req.request_method, req.path.sub(%r{\A/api/?}, '').split('/'), body) }
    res.status = 200
    res.body = JSON.generate(out)
    me = out.is_a?(Hash) && out['me']
    log_auth(req, "ok#{me ? " (#{me['role']})" : ''}")
  rescue ApiError => e
    res.status = e.status
    res.body = JSON.generate(error: e.message)
    log_auth(req, "failed: #{e.message}")
  rescue JSON::ParserError
    res.status = 400
    res.body = JSON.generate(error: 'Invalid JSON')
  end

  # Prints sign-up / log-in outcomes (never emails or passwords) to help debug account issues.
  def log_auth(req, result)
    return unless req.request_method == 'POST' && req.path =~ %r{/api/auth/(signup|login)\z}
    warn "[#{Time.now.strftime('%H:%M:%S')}] #{Regexp.last_match(1)} #{result}"
  end

  def current_user(req)
    token = req.cookies.find { |c| c.name == COOKIE }&.value
    uid = token && DB['sessions'][token]
    uid && DB['users'].find { |u| u['id'] == uid }
  end

  def user!(req)
    current_user(req) || raise(ApiError.new(401, 'Please log in first'))
  end

  # Which roles may manage each area. Members can only post and reply; viewers can only read.
  ROLES = %w[admin editor moderator member viewer].freeze
  AREAS = {
    'content' => %w[admin editor],      # tools, courses (with videos), tool videos, resources
    'community' => %w[admin moderator], # community questions and replies
    'members' => %w[admin]              # member list and roles
  }.freeze

  def allowed!(req, area)
    u = user!(req)
    raise ApiError.new(403, "Your role can't manage #{area}") unless AREAS[area].include?(u['role'])
    u
  end

  def poster!(req)
    u = user!(req)
    raise ApiError.new(403, 'Your account can view content but not post') if u['role'] == 'viewer'
    u
  end

  def area_for(kind)
    kind == 'posts' ? 'community' : 'content'
  end

  def create_user(b, role)
    name = clean(b['name'].to_s)
    email = b['email'].to_s.strip.downcase
    password = b['password'].to_s
    raise ApiError.new(422, 'Please enter a name') if name.empty?
    raise ApiError.new(422, 'Please enter a valid email') unless email.match?(/\A[^@\s]+@[^@\s]+\.[^@\s]+\z/)
    raise ApiError.new(422, 'Password must be at least 8 characters') if password.length < 8
    raise ApiError.new(409, 'An account with this email already exists') if DB['users'].any? { |u| u['email'] == email }
    salt, hash = hash_password(password)
    user = { 'id' => "u#{SecureRandom.hex(6)}", 'name' => name, 'email' => email, 'salt' => salt, 'hash' => hash,
             'role' => role, 'createdAt' => Time.now.utc.iso8601 }
    DB['users'] << user
    save_db(DB)
    user
  end

  def start_session(res, user)
    token = SecureRandom.hex(32)
    DB['sessions'][token] = user['id']
    save_db(DB)
    c = WEBrick::Cookie.new(COOKIE, token)
    c.path = '/'
    c.max_age = 60 * 60 * 24 * 30
    res['Set-Cookie'] = "#{c}; HttpOnly; SameSite=Lax"
  end

  def route(req, res, method, parts, b)
    # Passwords must reach create_user untouched; it cleans the name itself.
    b = clean(b) unless parts[0] == 'auth' || parts[0..1] == %w[admin users]
    kind, id = parts[1], parts[2] if parts[0] == 'admin'
    id = parts[1] if parts[0] == 'posts'
    rid = parts[3]
    case "#{method} #{parts.join('/')}"
    when 'GET content'
      # Guests only get topic names (for the landing page); the content itself is for members.
      user = current_user(req)
      keys = user ? %w[topics courses tools resources posts videos] : %w[topics]
      %w[courses tools resources posts videos].to_h { |k| [k, []] }.merge(DB.slice(*keys)).merge('me' => public_user(user))

    when 'GET auth/me'
      { 'me' => public_user(current_user(req)) }

    when 'POST auth/signup'
      # The very first account becomes the admin, so the owner can manage content.
      role = DB['users'].none? { |u| u['role'] == 'admin' } ? 'admin' : 'member'
      user = create_user(b, role)
      start_session(res, user)
      { 'me' => public_user(user) }

    when 'POST auth/login'
      email = b['email'].to_s.strip.downcase
      user = DB['users'].find { |u| u['email'] == email }
      ok = user && secure_eq(hash_password(b['password'].to_s, user['salt'])[1], user['hash'])
      raise ApiError.new(401, 'Email or password is incorrect') unless ok
      start_session(res, user)
      { 'me' => public_user(user) }

    when 'POST auth/logout'
      token = req.cookies.find { |c| c.name == COOKIE }&.value
      DB['sessions'].delete(token) && save_db(DB) if token
      res['Set-Cookie'] = "#{COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
      { 'ok' => true }

    when 'PUT auth/me'
      user = user!(req)
      name = clean(b['name'].to_s)
      raise ApiError.new(422, 'Please enter your name') if name.empty?
      user['name'] = name
      save_db(DB)
      { 'me' => public_user(user) }

    # Members post questions and replies.
    when 'POST posts'
      user = poster!(req)
      post = new_post(build_item('posts', b), user)
      DB['posts'].unshift(post)
      save_db(DB)
      post

    when %r{\APOST posts/[\w-]+/replies\z}
      user = poster!(req)
      post = DB['posts'].find { |p| p['id'] == id } || raise(ApiError.new(404, 'Discussion not found'))
      text = require_str(b, 'text', 'Reply')
      reply = { 'id' => "r#{SecureRandom.hex(4)}", 'author' => initials(user['name']), 'name' => user['name'],
                'userId' => user['id'], 'text' => text }
      post['replies'] << reply
      save_db(DB)
      post

    when %r{\ADELETE posts/[\w-]+/replies/[\w-]+\z}
      allowed!(req, 'community')
      post = DB['posts'].find { |p| p['id'] == id } || raise(ApiError.new(404, 'Discussion not found'))
      post['replies'].reject! { |r| r['id'] == rid }
      save_db(DB)
      post

    # Admin: create / update / delete content.
    when %r{\APOST admin/(courses|tools|resources|posts|videos)\z}
      user = allowed!(req, area_for(kind))
      list = DB[kind] || raise(ApiError.new(404, 'Unknown collection'))
      fields = build_item(kind, b)
      item = kind == 'posts' ? new_post(fields, user) : fields.merge('id' => slugify(fields['title'] || fields['name'], list))
      list.unshift(item)
      save_db(DB)
      item

    when %r{\APUT admin/(courses|tools|resources|posts|videos)/[\w-]+\z}
      allowed!(req, area_for(kind))
      list = DB[kind] || raise(ApiError.new(404, 'Unknown collection'))
      item = list.find { |x| x['id'] == id } || raise(ApiError.new(404, 'Not found'))
      item.merge!(build_item(kind, b))
      item.delete('homeBlurb') # seed-only copy; edited courses show their own blurb everywhere
      save_db(DB)
      item

    when %r{\ADELETE admin/(courses|tools|resources|posts|videos)/[\w-]+\z}
      allowed!(req, area_for(kind))
      list = DB[kind] || raise(ApiError.new(404, 'Unknown collection'))
      raise ApiError.new(404, 'Not found') unless list.reject! { |x| x['id'] == id }
      save_db(DB)
      { 'ok' => true }

    when 'GET admin/users'
      allowed!(req, 'members')
      DB['users'].map { |u| public_user(u).merge('createdAt' => u['createdAt']) }

    # Admins create accounts directly and pick the role.
    when 'POST admin/users'
      allowed!(req, 'members')
      raise ApiError.new(422, 'Pick a role') unless ROLES.include?(b['role'])
      user = create_user(b, b['role'])
      public_user(user).merge('createdAt' => user['createdAt'])

    when %r{\ADELETE admin/users/[\w-]+\z}
      me = allowed!(req, 'members')
      raise ApiError.new(422, 'You cannot remove your own account') if id == me['id']
      raise ApiError.new(404, 'User not found') unless DB['users'].reject! { |u| u['id'] == id }
      DB['sessions'].delete_if { |_, uid| uid == id } # log them out everywhere
      save_db(DB)
      { 'ok' => true }

    when %r{\APUT admin/users/[\w-]+\z}
      me = allowed!(req, 'members')
      user = DB['users'].find { |u| u['id'] == id } || raise(ApiError.new(404, 'User not found'))
      raise ApiError.new(422, 'You cannot change your own role') if user['id'] == me['id']
      raise ApiError.new(422, 'Unknown role') unless ROLES.include?(b['role'])
      user['role'] = b['role']
      save_db(DB)
      public_user(user)

    else
      raise ApiError.new(404, 'Not found')
    end
  end
end

port = (ENV['PORT'] || 5173).to_i
server = WEBrick::HTTPServer.new(Port: port, BindAddress: '127.0.0.1', DocumentRoot: File.join(ROOT, 'mohl'),
                                 AccessLog: [], Logger: WEBrick::Log.new($stderr, WEBrick::Log::WARN))
server.mount('/api', Api)
trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }
warn "MoHL running at http://localhost:#{port}"
server.start
