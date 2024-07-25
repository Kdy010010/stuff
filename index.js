const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // 원본 파일명을 그대로 사용
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 파일 크기 제한 설정 (예: 10MB)
});

// 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// 데이터 저장을 위한 디렉토리
const dataDir = path.join(__dirname, 'data');

// JSON 파일에서 데이터 로드
function loadPosts(board) {
  const filePath = path.join(dataDir, `${board}.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = fs.readFileSync(filePath);
  try {
    const posts = JSON.parse(data);
    return Array.isArray(posts) ? posts : [];
  } catch (error) {
    return [];
  }
}

// JSON 파일에 데이터 저장
function savePosts(board, posts) {
  const filePath = path.join(dataDir, `${board}.json`);
  fs.writeFileSync(filePath, JSON.stringify(posts, null, 2));
}

// 메인 페이지
app.get('/', (req, res) => {
  fs.readdir(dataDir, (err, files) => {
    if (err) {
      return res.status(500).send('Error reading boards');
    }
    const boards = files.map(file => path.basename(file, '.json'));
    res.render('index', { boards });
  });
});

// 특정 게시판 페이지
app.get('/board/:board', (req, res) => {
  const board = req.params.board;
  const posts = loadPosts(board);
  res.render('board', { board, posts });
});

// 검색 결과 페이지
app.get('/board/:board/search', (req, res) => {
  const board = req.params.board;
  const query = req.query.q;
  const posts = loadPosts(board);
  const filteredPosts = posts.filter(post => 
    post.title.includes(query) || post.content.includes(query)
  );
  res.render('board', { board, posts: filteredPosts });
});

// 특정 게시물 페이지
app.get('/board/:board/post/:postId', (req, res) => {
  const board = req.params.board;
  const postId = parseInt(req.params.postId, 10);
  const posts = loadPosts(board);
  const post = posts.find(post => post.id === postId);
  res.render('post', { board, post });
});

// 새 글 작성 페이지
app.get('/board/:board/new', (req, res) => {
  const board = req.params.board;
  res.render('new', { board });
});

// 새 글 작성 처리
app.post('/board/:board/posts', upload.single('file'), (req, res) => {
  const board = req.params.board;
  let posts = loadPosts(board);

  if (!Array.isArray(posts)) {
    posts = [];
  }

  const newPost = {
    id: Date.now(),
    title: req.body.title,
    content: req.body.content,
    file: req.file ? req.file.path : null,
    createdAt: new Date(),
    comments: [],
    likes: 0,
    dislikes: 0
  };

  posts.push(newPost);
  savePosts(board, posts);

  res.redirect(`/board/${board}`);
});

// 댓글 작성 처리
app.post('/board/:board/post/:postId/comment', (req, res) => {
  const board = req.params.board;
  const postId = parseInt(req.params.postId, 10);
  let posts = loadPosts(board);

  const post = posts.find(post => post.id === postId);
  if (post) {
    post.comments.push({
      content: req.body.content,
      createdAt: new Date()
    });
    savePosts(board, posts);
  }

  res.redirect(`/board/${board}/post/${postId}`);
});

// 좋아요/나빠요 처리
app.post('/board/:board/post/:postId/like', (req, res) => {
  const board = req.params.board;
  const postId = parseInt(req.params.postId, 10);
  let posts = loadPosts(board);

  const post = posts.find(post => post.id === postId);
  if (post) {
    post.likes += 1;
    savePosts(board, posts);
  }

  res.redirect(`/board/${board}/post/${postId}`);
});

app.post('/board/:board/post/:postId/dislike', (req, res) => {
  const board = req.params.board;
  const postId = parseInt(req.params.postId, 10);
  let posts = loadPosts(board);

  const post = posts.find(post => post.id === postId);
  if (post) {
    post.dislikes += 1;
    savePosts(board, posts);
  }

  res.redirect(`/board/${board}/post/${postId}`);
});

// 새 게시판 작성 페이지
app.get('/newboard', (req, res) => {
  res.render('newboard');
});

// 새 게시판 작성 처리
app.post('/newboard', (req, res) => {
  const board = req.body.boardName;
  const filePath = path.join(dataDir, `${board}.json`);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]');  // 빈 배열로 초기화된 파일 생성
  }

  res.redirect(`/board/${board}`);
});

// 규칙 페이지
app.get('/rules', (req, res) => {
  res.render('rules');
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
