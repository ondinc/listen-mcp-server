# LISTEN MCP Server

LISTEN MCP Serverは、[LISTEN](https://listen.style/) のポッドキャストデータをClaudeやCursorなどのLLMクライアント（AIエディタ/アシスタント）から直接操作できるようにするための [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 準拠のサーバーです。

このサーバーを経由することで、AIエディタとチャットしながら「自分の最新ポッドキャスト一覧を教えて」「このエピソードの文字起こしを取得してブログ記事にまとめて」といった高度な指示がシームレスに行えるようになります。

## 🌟 主な機能 (Tools)

AIから以下の情報にアクセスできます。

- **`get_my_podcasts`**  
  ご自身が管理（認証済み）しているポッドキャストの一覧を取得します。

- **`get_podcast_episodes`**  
  特定のポッドキャストIDを指定して、そこに含まれるエピソード一覧を取得します。

- **`get_episode_transcript`**  
  指定したエピソードの文字起こしデータを取得します。出力フォーマットとして `txt`（プレーンテキスト）、`srt`、`vtt` をサポートしています。

---

## 🚀 使い方 (エンドユーザー向け)

### 事前準備：APIトークンの発行

1. LISTEN（ [https://listen.style/](https://listen.style/) ）にログインします。
2. 画面右上のユーザーアイコンから「API Tokens（APIトークン）」設定ページを開きます。
3. 新しいAPIトークンを作成し、発行された文字列を**手元にコピー**しておいてください。（※セキュリティのため、一度しか表示されません）

### Claude Desktopでの設定

Claude Desktopの設定ファイル（Macの場合は `~/Library/Application Support/Claude/claude_desktop_config.json`）を開き、`mcpServers` オブジェクトに以下を追記してアプリを再起動します。

```json
{
  "mcpServers": {
    "listen-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@ondinc/listen-mcp-server"
      ],
      "env": {
        "LISTEN_API_TOKEN": "【コピーしたAPIトークン】",
        "LISTEN_GRAPHQL_URL": "https://listen.style/graphql"
      }
    }
  }
}
```

### Cursorでの設定

1. Cursorのエディター設定（Settings）から **Features > MCP** を開きます。
2. **「+ Add New MCP Server」** をクリックし、以下のように設定します。

- **Name**: `listen-mcp`
- **Type**: `command`
- **Command**: `npx -y @ondinc/listen-mcp-server`
- **Environment Variables**:
  ```
  LISTEN_API_TOKEN=【コピーしたAPIトークン】
  LISTEN_GRAPHQL_URL=https://listen.style/graphql
  ```

---

## 🛠 開発者向け (ローカルでの起動・デバッグ)

ローカルでリポジトリを手元にクローンし、開発およびテストを行う場合の手順です。

### インストールとビルド
```bash
git clone https://github.com/ondinc/listen-mcp-server.git
cd listen-mcp-server
npm install
npm run build
```

### Inspectorによる機能テスト
ターミナルで以下のコマンドを実行することで、ブラウザ上でMCPの各ツールをテストできます。

```bash
LISTEN_API_TOKEN="【あなたのAPIトークン】" \
LISTEN_GRAPHQL_URL="https://listen.style/graphql" \
npx @modelcontextprotocol/inspector node build/index.js
```
（※ローカル開発用のURL（例: `https://listen.test/...`）に向けてテストしたい場合は、自己署名証明書によるfetchエラーを回避するため、先頭に `NODE_TLS_REJECT_UNAUTHORIZED=0` を付与して実行してください）
