import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const CATEGORIES = [
  { value: 'all', label: '全部', tone: 'slate', icon: '总', description: '看看邻里新鲜事' },
  { value: 'carpool', label: '拼车', tone: 'blue', icon: '车', description: '顺路同行和通勤互助' },
  { value: 'errand', label: '跑腿', tone: 'teal', icon: '跑', description: '代取代送和临时帮忙' },
  { value: 'housekeeping', label: '家政', tone: 'purple', icon: '家', description: '维修、安装和上门服务' },
  { value: 'cleaning', label: '保洁', tone: 'green', icon: '洁', description: '日常保洁和深度清理' },
  { value: 'lost_found', label: '失物招领', tone: 'amber', icon: '寻', description: '丢了捡到都来登记' },
  { value: 'notice', label: '公告', tone: 'rose', icon: '告', description: '小区提醒和公共信息' },
];

const STATUS_LABELS = {
  open: '进行中',
  done: '已完成',
  closed: '已关闭',
};

const KIND_LABELS = {
  request: '我需要',
  offer: '我可以提供',
};

const emptyPost = {
  category: 'carpool',
  kind: 'request',
  title: '',
  content: '',
  contact: '',
  location: '',
  serviceTime: '',
  budget: '',
  from: '',
  to: '',
  date: '',
  time: '',
  seats: '1',
  reward: '',
  itemName: '',
  lostFoundType: 'lost',
};

const emptyState = {
  profiles: [],
  posts: [],
  comments: [],
};

function phoneToEmail(phone) {
  const normalized = phone.replace(/\D/g, '');
  return `${normalized}@runlongyuan-users.com`;
}

function getCategory(category) {
  return CATEGORIES.find((item) => item.value === category) || CATEGORIES[0];
}

function mapProfile(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    isAdmin: Boolean(row.is_admin),
    createdAt: row.created_at,
  };
}

function mapPost(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    contact: row.contact,
    location: row.location || '',
    kind: row.kind || 'request',
    status: row.status,
    metadata: row.metadata || {},
    imageUrls: row.image_urls || [],
    authorId: row.author_id,
    createdAt: row.created_at,
  };
}

function mapComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function buildMetadata(form) {
  if (form.category === 'carpool') {
    return {
      from: form.from.trim(),
      to: form.to.trim(),
      date: form.date,
      time: form.time,
      seats: Math.max(1, Number(form.seats) || 1),
      budget: form.budget.trim(),
    };
  }

  if (form.category === 'errand') {
    return {
      from: form.from.trim(),
      to: form.to.trim(),
      serviceTime: form.serviceTime.trim(),
      reward: form.reward.trim(),
    };
  }

  if (form.category === 'lost_found') {
    return {
      type: form.lostFoundType,
      itemName: form.itemName.trim(),
      serviceTime: form.serviceTime.trim(),
    };
  }

  return {
    serviceTime: form.serviceTime.trim(),
    budget: form.budget.trim(),
  };
}

function getPostSummary(post) {
  const data = post.metadata || {};

  if (post.category === 'carpool') {
    return `${data.from || '未填出发地'} -> ${data.to || '未填目的地'} · ${data.date || '日期待定'} ${data.time || ''}`;
  }
  if (post.category === 'errand') {
    return `${data.from || '取件地待定'} -> ${data.to || '送达地待定'} · ${data.reward || '报酬可议'}`;
  }
  if (post.category === 'lost_found') {
    return `${data.type === 'found' ? '捡到' : '丢失'}：${data.itemName || '物品未命名'} · ${post.location || '地点待补充'}`;
  }
  if (post.category === 'housekeeping' || post.category === 'cleaning') {
    return `${post.location || '地点待补充'} · ${data.serviceTime || '时间可议'} · ${data.budget || '预算可议'}`;
  }

  return post.location || '润珑苑';
}

function getExamples(category) {
  return EXAMPLES[category] || [];
}

function applyExample(example, setPostForm) {
  setPostForm((previous) => ({
    ...previous,
    ...example,
  }));
}

const EXAMPLES = {
  carpool: [
    {
      kind: 'request',
      title: '明早想找顺路车去科技园',
      content: '一人出行，早上 8 点左右从润珑苑出发，希望能拼到顺路车。',
      from: '润珑苑',
      to: '科技园',
      date: '',
      time: '08:00',
      seats: '1',
      budget: '费用可议',
      location: '润珑苑东门',
    },
    {
      kind: 'offer',
      title: '周末可顺路带人去深圳北',
      content: '周六上午出发，车上还有 2 个座位，可在润珑苑门口上车。',
      from: '润珑苑',
      to: '深圳北站',
      time: '10:00',
      seats: '2',
      budget: '分摊油费即可',
      location: '润珑苑东门',
    },
  ],
  errand: [
    {
      kind: 'request',
      title: '今晚想请邻居帮忙取快递',
      content: '快递在驿站，晚上不方便下楼，希望顺路的邻居帮忙带到楼下。',
      from: '小区驿站',
      to: '3 栋楼下',
      serviceTime: '今晚 8 点前',
      reward: '10 元或一杯奶茶',
      location: '润珑苑驿站',
    },
    {
      kind: 'offer',
      title: '下班后可以帮忙带快递或买菜',
      content: '工作日晚上回小区，顺路可以帮邻居从驿站带快递，也可以顺手买菜。',
      from: '驿站/菜店',
      to: '润珑苑',
      serviceTime: '工作日 19:00 后',
      reward: '随意给点辛苦费',
      location: '润珑苑',
    },
  ],
  housekeeping: [
    {
      kind: 'request',
      title: '想找师傅帮忙修厨房水龙头',
      content: '厨房水龙头有点漏水，希望小区里有经验的师傅帮忙看看。',
      serviceTime: '周末白天',
      budget: '费用可议',
      location: '润珑苑',
    },
    {
      kind: 'offer',
      title: '周末可以帮忙装灯、修小件',
      content: '平时会做一些简单安装维修，周末有空可以帮邻居装灯、换水龙头、修小件。',
      serviceTime: '周末下午',
      budget: '看情况协商',
      location: '润珑苑',
    },
  ],
  cleaning: [
    {
      kind: 'request',
      title: '想约一次厨房深度保洁',
      content: '厨房油污比较重，希望找靠谱保洁做一次深度清洁。',
      serviceTime: '本周六上午',
      budget: '200 元左右',
      location: '润珑苑',
    },
    {
      kind: 'offer',
      title: '阿姨周末可接小区保洁',
      content: '熟悉日常保洁、擦玻璃、厨房清理，周末可以在小区内接单。',
      serviceTime: '周末可约',
      budget: '按面积协商',
      location: '润珑苑',
    },
  ],
  lost_found: [
    {
      kind: 'request',
      title: '寻找一串钥匙',
      content: '可能掉在东门到 3 栋路上，钥匙扣是蓝色的，如有捡到请联系。',
      lostFoundType: 'lost',
      itemName: '蓝色钥匙扣钥匙',
      serviceTime: '今天上午',
      location: '东门到 3 栋路上',
    },
    {
      kind: 'offer',
      title: '捡到一张门禁卡',
      content: '在小区花园附近捡到门禁卡一张，请失主描述卡套颜色后认领。',
      lostFoundType: 'found',
      itemName: '门禁卡',
      serviceTime: '今天下午',
      location: '中心花园',
    },
  ],
  notice: [
    {
      kind: 'offer',
      title: '周末邻里二手置换小提醒',
      content: '如果大家有闲置小物，可以在评论里补充，方便邻居互相置换。',
      location: '润珑苑',
    },
  ],
};

function App() {
  const [state, setState] = useState(emptyState);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', phone: '', password: '' });
  const [postForm, setPostForm] = useState(emptyPost);
  const [imageFiles, setImageFiles] = useState([]);
  const [filters, setFilters] = useState({ category: 'all', kind: 'all', status: 'open', keyword: '' });
  const [activePostId, setActivePostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initialize();

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setCurrentUser(session?.user ? await loadCurrentUser(session.user.id) : null);
      } catch {
        setCurrentUser(null);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function loadSharedState() {
    const [profilesResult, postsResult, commentsResult] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('community_posts').select('*').order('created_at', { ascending: false }),
      supabase.from('comments').select('*').order('created_at', { ascending: true }),
    ]);

    for (const result of [profilesResult, postsResult, commentsResult]) {
      if (result.error) throw result.error;
    }

    return {
      profiles: profilesResult.data.map(mapProfile),
      posts: postsResult.data.map(mapPost),
      comments: commentsResult.data.map(mapComment),
    };
  }

  async function loadCurrentUser(userId) {
    if (!userId) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return mapProfile(data);
  }

  async function initialize() {
    setIsLoading(true);
    try {
      const [{ data: sessionData }, sharedState] = await Promise.all([
        supabase.auth.getSession(),
        loadSharedState(),
      ]);
      setState(sharedState);
      setActivePostId((previous) => previous || sharedState.posts[0]?.id || null);
      setCurrentUser(sessionData.session?.user ? await loadCurrentUser(sessionData.session.user.id) : null);
    } catch (error) {
      showNotice(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshState(preferredPostId) {
    const sharedState = await loadSharedState();
    setState(sharedState);
    setActivePostId((previous) => {
      if (preferredPostId !== undefined) {
        return preferredPostId || sharedState.posts[0]?.id || null;
      }
      return previous || sharedState.posts[0]?.id || null;
    });
  }

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3000);
  }

  const profilesById = useMemo(() => {
    return Object.fromEntries(state.profiles.map((profile) => [profile.id, profile]));
  }, [state.profiles]);

  const filteredPosts = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    return state.posts
      .filter((post) => filters.category === 'all' || post.category === filters.category)
      .filter((post) => filters.kind === 'all' || post.kind === filters.kind)
      .filter((post) => filters.status === 'all' || post.status === filters.status)
      .filter((post) => {
        if (!keyword) return true;
        return [
          post.title,
          post.content,
          post.contact,
          post.location,
          KIND_LABELS[post.kind],
          getCategory(post.category).label,
          getPostSummary(post),
        ].join(' ').toLowerCase().includes(keyword);
      });
  }, [filters, state.posts]);

  const activePost = state.posts.find((post) => post.id === activePostId) || filteredPosts[0] || state.posts[0] || null;
  const activeComments = state.comments.filter((comment) => comment.postId === activePost?.id);
  const canManageActivePost = Boolean(
    currentUser && activePost && (currentUser.id === activePost.authorId || currentUser.isAdmin),
  );
  const categoryCounts = useMemo(() => {
    return state.posts.reduce((counts, post) => {
      counts[post.category] = (counts[post.category] || 0) + 1;
      return counts;
    }, {});
  }, [state.posts]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const name = authForm.name.trim();
    const phone = authForm.phone.trim();
    const password = authForm.password.trim();

    if (!phone || !password || (authMode === 'register' && !name)) {
      showNotice('请完整填写账号信息');
      return;
    }

    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: phoneToEmail(phone),
          password,
        });
        if (error) throw error;
        const profile = await loadCurrentUser(data.user.id);
        setCurrentUser(profile);
        showNotice(`欢迎回来，${profile.name}`);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: phoneToEmail(phone),
          password,
          options: { data: { name, phone } },
        });
        if (error) throw error;
        if (!data.session) {
          throw new Error('注册成功但未自动登录。请在 Supabase Auth 设置里关闭邮箱确认后再试。');
        }

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          name,
          phone,
        });
        if (profileError) throw profileError;

        const profile = await loadCurrentUser(data.user.id);
        setCurrentUser(profile);
        setAuthForm({ name: '', phone: '', password: '' });
        await refreshState();
        showNotice('注册成功，已为你登录');
      }
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    showNotice('已退出登录');
  }

  async function handlePostSubmit(event) {
    event.preventDefault();
    if (!currentUser) {
      showNotice('请先登录后再发布');
      return;
    }

    const basePayload = {
      category: postForm.category,
      kind: postForm.kind,
      title: postForm.title.trim(),
      content: postForm.content.trim(),
      contact: postForm.contact.trim(),
      location: postForm.location.trim(),
      metadata: buildMetadata(postForm),
      author_id: currentUser.id,
      status: 'open',
    };

    if (!basePayload.title || !basePayload.content || !basePayload.contact) {
      showNotice('请补充标题、详情和联系方式');
      return;
    }

    try {
      const imageUrls = await uploadImages(imageFiles, currentUser.id);
      const payload = {
        ...basePayload,
        image_urls: imageUrls,
      };
      const { data, error } = await supabase.from('community_posts').insert(payload).select('*').single();
      if (error) throw error;
      setPostForm(emptyPost);
      setImageFiles([]);
      await refreshState(data.id);
      showNotice('发布成功，邻居们现在都能看到了');
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function uploadImages(files, userId) {
    if (!files.length) return [];

    const uploads = files.slice(0, 4).map(async (file, index) => {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/${Date.now()}-${index}.${ext}`;
      const { error } = await supabase.storage.from('community-images').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from('community-images').getPublicUrl(path);
      return data.publicUrl;
    });

    return Promise.all(uploads);
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!currentUser) {
      showNotice('请先登录后再评论');
      return;
    }
    if (!activePost || !commentText.trim()) {
      showNotice('请填写评论内容');
      return;
    }

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: activePost.id,
        author_id: currentUser.id,
        content: commentText.trim(),
      });
      if (error) throw error;
      setCommentText('');
      await refreshState(activePost.id);
      showNotice('评论已发布');
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function updatePostStatus(status) {
    if (!activePost || !canManageActivePost) return;

    try {
      const { error } = await supabase.from('community_posts').update({ status }).eq('id', activePost.id);
      if (error) throw error;
      await refreshState(activePost.id);
      showNotice('状态已更新');
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function handleDeletePost() {
    if (!activePost || !canManageActivePost) return;

    const confirmed = window.confirm('确定删除这条信息吗？相关评论也会一起删除。');
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('community_posts').delete().eq('id', activePost.id);
      if (error) throw error;
      await refreshState(null);
      showNotice('信息已删除');
    } catch (error) {
      showNotice(error.message);
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <nav className="topbar">
          <div className="brand">
            <span className="brandMark">邻</span>
            <span>润珑苑邻里互助</span>
          </div>
          {currentUser ? (
            <div className="userBox">
              <span>{currentUser.name}{currentUser.isAdmin ? ' · 管理员' : ''}</span>
              <button className="ghostButton" onClick={handleLogout}>退出</button>
            </div>
          ) : (
            <span className="muted">登录后可发布、评论和管理自己的信息</span>
          )}
        </nav>

        <div className="heroGrid">
          <section>
            <p className="eyebrow">润珑苑社区信息共享平台</p>
            <h1>让润珑苑生活，多一些方便和回应</h1>
            <p className="heroText">
              拼车、跑腿、家政、保洁、失物招领和小区公告，都可以在这里被邻里看见。
            </p>
            <div className="stats">
              <strong>{state.posts.length}</strong>
              <span>条信息</span>
              <strong>{state.profiles.length}</strong>
              <span>位邻居</span>
              <strong>{state.comments.length}</strong>
              <span>条回应</span>
            </div>
            <div className="channelDeck">
              {CATEGORIES.filter((category) => category.value !== 'all').map((category) => (
                <button
                  key={category.value}
                  className={`channelCard ${filters.category === category.value ? 'selected' : ''}`}
                  onClick={() => setFilters({ ...filters, category: category.value })}
                >
                  <span className={`channelIcon ${category.tone}`}>{category.icon}</span>
                  <strong>{category.label}</strong>
                  <small>{category.description}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="card authCard neighborPass">
            <p className="eyebrow">邻里通行证</p>
            <h2>登录后一起维护信息</h2>
            <div className="tabs">
              <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
                登录
              </button>
              <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
                注册
              </button>
            </div>
            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <label>
                  昵称
                  <input
                    value={authForm.name}
                    onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                    placeholder="例如：3 栋张先生"
                  />
                </label>
              )}
              <label>
                手机号
                <input
                  value={authForm.phone}
                  onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })}
                  placeholder="用于注册和登录"
                />
              </label>
              <label>
                密码
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  placeholder="至少 6 位"
                />
              </label>
              <button className="primaryButton" type="submit">
                {authMode === 'login' ? '立即登录' : '创建账号'}
              </button>
            </form>
          </section>
        </div>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <main className="mainGrid">
        <section className="card publishCard">
          <div className="sectionTitle">
            <p className="eyebrow">发到小区板</p>
            <h2>让邻居看见你的需求</h2>
          </div>
          <form className="postForm" onSubmit={handlePostSubmit}>
            <label>
              信息分类
              <select
                value={postForm.category}
                onChange={(event) => setPostForm({ ...postForm, category: event.target.value })}
              >
                {CATEGORIES.filter((item) => item.value !== 'all').map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </label>
            <div className="segmented kindSwitch">
              <button
                type="button"
                className={postForm.kind === 'request' ? 'selected' : ''}
                onClick={() => setPostForm({ ...postForm, kind: 'request' })}
              >
                我有需求
              </button>
              <button
                type="button"
                className={postForm.kind === 'offer' ? 'selected' : ''}
                onClick={() => setPostForm({ ...postForm, kind: 'offer' })}
              >
                我能提供
              </button>
            </div>
            <div className="exampleBox">
              <strong>不知道怎么写？试试这些示例</strong>
              <div>
                {getExamples(postForm.category).map((example) => (
                  <button
                    key={`${example.kind}-${example.title}`}
                    type="button"
                    onClick={() => applyExample(example, setPostForm)}
                  >
                    <span>{KIND_LABELS[example.kind]}</span>
                    {example.title}
                  </button>
                ))}
              </div>
            </div>
            <label>
              标题
              <input
                value={postForm.title}
                onChange={(event) => setPostForm({ ...postForm, title: event.target.value })}
                placeholder="一句话说明你的需求"
              />
            </label>
            <label>
              详细说明
              <textarea
                value={postForm.content}
                onChange={(event) => setPostForm({ ...postForm, content: event.target.value })}
                placeholder="写清楚时间、地点、要求、注意事项等"
              />
            </label>

            {postForm.category === 'carpool' && (
              <>
                <div className="twoColumns">
                  <label>
                    出发地
                    <input value={postForm.from} onChange={(event) => setPostForm({ ...postForm, from: event.target.value })} />
                  </label>
                  <label>
                    目的地
                    <input value={postForm.to} onChange={(event) => setPostForm({ ...postForm, to: event.target.value })} />
                  </label>
                </div>
                <div className="twoColumns">
                  <label>
                    日期
                    <input type="date" value={postForm.date} onChange={(event) => setPostForm({ ...postForm, date: event.target.value })} />
                  </label>
                  <label>
                    时间
                    <input type="time" value={postForm.time} onChange={(event) => setPostForm({ ...postForm, time: event.target.value })} />
                  </label>
                </div>
                <div className="twoColumns">
                  <label>
                    人数/座位
                    <input type="number" min="1" value={postForm.seats} onChange={(event) => setPostForm({ ...postForm, seats: event.target.value })} />
                  </label>
                  <label>
                    费用
                    <input value={postForm.budget} onChange={(event) => setPostForm({ ...postForm, budget: event.target.value })} placeholder="可议" />
                  </label>
                </div>
              </>
            )}

            {postForm.category === 'errand' && (
              <>
                <div className="twoColumns">
                  <label>
                    取件/出发地
                    <input value={postForm.from} onChange={(event) => setPostForm({ ...postForm, from: event.target.value })} />
                  </label>
                  <label>
                    送达地
                    <input value={postForm.to} onChange={(event) => setPostForm({ ...postForm, to: event.target.value })} />
                  </label>
                </div>
                <div className="twoColumns">
                  <label>
                    期望时间
                    <input value={postForm.serviceTime} onChange={(event) => setPostForm({ ...postForm, serviceTime: event.target.value })} placeholder="例如：今晚 8 点前" />
                  </label>
                  <label>
                    报酬
                    <input value={postForm.reward} onChange={(event) => setPostForm({ ...postForm, reward: event.target.value })} placeholder="例如：20 元/可议" />
                  </label>
                </div>
              </>
            )}

            {(postForm.category === 'housekeeping' || postForm.category === 'cleaning') && (
              <div className="twoColumns">
                <label>
                  服务时间
                  <input value={postForm.serviceTime} onChange={(event) => setPostForm({ ...postForm, serviceTime: event.target.value })} placeholder="例如：周六上午" />
                </label>
                <label>
                  预算
                  <input value={postForm.budget} onChange={(event) => setPostForm({ ...postForm, budget: event.target.value })} placeholder="例如：可议" />
                </label>
              </div>
            )}

            {postForm.category === 'lost_found' && (
              <>
                <div className="segmented">
                  <button
                    type="button"
                    className={postForm.lostFoundType === 'lost' ? 'selected' : ''}
                    onClick={() => setPostForm({ ...postForm, lostFoundType: 'lost' })}
                  >
                    我丢了
                  </button>
                  <button
                    type="button"
                    className={postForm.lostFoundType === 'found' ? 'selected' : ''}
                    onClick={() => setPostForm({ ...postForm, lostFoundType: 'found' })}
                  >
                    我捡到
                  </button>
                </div>
                <div className="twoColumns">
                  <label>
                    物品名称
                    <input value={postForm.itemName} onChange={(event) => setPostForm({ ...postForm, itemName: event.target.value })} />
                  </label>
                  <label>
                    时间
                    <input value={postForm.serviceTime} onChange={(event) => setPostForm({ ...postForm, serviceTime: event.target.value })} placeholder="例如：今天上午" />
                  </label>
                </div>
              </>
            )}

            <label>
              地点
              <input
                value={postForm.location}
                onChange={(event) => setPostForm({ ...postForm, location: event.target.value })}
                placeholder="例如：润珑苑东门 / 3 栋楼下"
              />
            </label>
            <label>
              联系方式
              <input
                value={postForm.contact}
                onChange={(event) => setPostForm({ ...postForm, contact: event.target.value })}
                placeholder="手机号/微信/门牌口令"
              />
            </label>
            <label>
              图片补充
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setImageFiles(Array.from(event.target.files || []).slice(0, 4))}
              />
            </label>
            {imageFiles.length > 0 && (
              <p className="fileHint">已选择 {imageFiles.length} 张图片，最多支持 4 张。</p>
            )}
            <button className="primaryButton" type="submit">发布信息</button>
          </form>

          <div className="safetyBox">
            <h3>社区提示</h3>
            <p>请自行核实对方身份、价格、时间和服务内容。涉及线下交易、上门服务或同行出行时，建议选择公共区域沟通并保留聊天记录。</p>
            <p>平台仅提供邻里信息发布与回应，不参与线下交易和服务履约。</p>
          </div>
        </section>

        <section className="listColumn">
          <div className="card toolbar">
            <div className="categoryGrid">
              {CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  className={filters.category === category.value ? 'selected' : ''}
                  onClick={() => setFilters({ ...filters, category: category.value })}
                >
                  <span>{category.icon}</span>
                  <strong>{category.label}</strong>
                  <small>{category.value === 'all' ? state.posts.length : categoryCounts[category.value] || 0}</small>
                </button>
              ))}
            </div>
            <div className="segmented">
              {[
                ['all', '全部'],
                ['request', '需求'],
                ['offer', '服务'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filters.kind === value ? 'selected' : ''}
                  onClick={() => setFilters({ ...filters, kind: value })}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="segmented">
              {[
                ['open', '进行中'],
                ['done', '已完成'],
                ['closed', '已关闭'],
                ['all', '全部状态'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filters.status === value ? 'selected' : ''}
                  onClick={() => setFilters({ ...filters, status: value })}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              value={filters.keyword}
              onChange={(event) => setFilters({ ...filters, keyword: event.target.value })}
              placeholder="搜索分类、标题、地点或关键词"
            />
          </div>

          <div className="postList">
            {isLoading && <div className="card empty">正在加载社区信息...</div>}
            {!isLoading && filteredPosts.map((post) => {
              const category = getCategory(post.category);
              return (
                <article
                  key={post.id}
                  className={`card postItem ${activePost?.id === post.id ? 'focused' : ''}`}
                  onClick={() => setActivePostId(post.id)}
                >
                  <div className="postMeta">
                    <span className={`pill ${category.tone}`}>{category.icon} {category.label}</span>
                    <span>{KIND_LABELS[post.kind]} · {STATUS_LABELS[post.status] || post.status}</span>
                  </div>
                  <h3>{post.title}</h3>
                  <p className="route">{getPostSummary(post)}</p>
                  {post.imageUrls.length > 0 && (
                    <div className="thumbStrip">
                      {post.imageUrls.slice(0, 3).map((url) => (
                        <img key={url} src={url} alt="" />
                      ))}
                    </div>
                  )}
                  <p className="muted">{profilesById[post.authorId]?.name || '匿名邻居'} · {post.contact}</p>
                </article>
              );
            })}
            {!isLoading && !filteredPosts.length && (
              <div className="card empty">没有找到匹配的信息</div>
            )}
          </div>
        </section>

        <aside className="card detailCard">
          {activePost ? (
            <>
              <div className="postMeta">
                <span className={`pill ${getCategory(activePost.category).tone}`}>
                  {getCategory(activePost.category).icon} {getCategory(activePost.category).label}
                </span>
                <span>{KIND_LABELS[activePost.kind]} · {formatTime(activePost.createdAt)} 发布</span>
              </div>
              <h2>{activePost.title}</h2>
              <p className="route large">{getPostSummary(activePost)}</p>
              <div className="detailGrid">
                <span>状态</span>
                <strong>{STATUS_LABELS[activePost.status] || activePost.status}</strong>
                <span>地点</span>
                <strong>{activePost.location || '未填写'}</strong>
                <span>联系</span>
                <strong>{activePost.contact}</strong>
                <span>发布人</span>
                <strong>{profilesById[activePost.authorId]?.name || '匿名邻居'}</strong>
              </div>
              <p className="description">{activePost.content}</p>
              {activePost.imageUrls.length > 0 && (
                <div className="imageGallery">
                  {activePost.imageUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="信息图片" />
                    </a>
                  ))}
                </div>
              )}

              {canManageActivePost && (
                <div className="manageBar">
                  <button type="button" onClick={() => updatePostStatus('done')}>标记完成</button>
                  <button type="button" onClick={() => updatePostStatus('closed')}>关闭信息</button>
                  <button className="dangerButton" type="button" onClick={handleDeletePost}>删除</button>
                </div>
              )}

              <div className="conversation">
                <h3>邻里回应</h3>
                {activeComments.map((comment) => (
                  <div className="message" key={comment.id}>
                    <strong>{profilesById[comment.authorId]?.name || '匿名邻居'}</strong>
                    <p>{comment.content}</p>
                    <span>{formatTime(comment.createdAt)}</span>
                  </div>
                ))}
                {!activeComments.length && <p className="muted">暂无回应，可以先问问细节。</p>}
                <form onSubmit={handleCommentSubmit} className="inlineForm">
                  <input
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="写一条回应"
                  />
                  <button type="submit">发送</button>
                </form>
              </div>
            </>
          ) : (
            <div className="empty">请选择一条信息查看详情</div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
