import asyncio
from enum import Enum
from colorama import init, Fore
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

import os
import json
import unittest

from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
init(autoreset=True)

# print current directory
print("Current directory:", os.getcwd())
base = os.getenv("LISTEN_MCP_SERVER_PATH", "")
index_path = (
    os.path.abspath(os.path.join(base, "build", "index.js"))
    if base
    else os.path.abspath("./build/index.js")
)
print("Resolved MCP server path:", index_path)

server_params = StdioServerParameters(
    command="node",
    args=[index_path],
    env={
        "LISTEN_API_TOKEN": os.getenv("LISTEN_API_TOKEN", ""),
        "LOG_LEVEL": os.getenv("LOG_LEVEL", "info"),
    },
)


class EpisodeStatus(str, Enum):
    PUBLISHED = "published"
    DRAFT = "draft"
    SCHEDULED = "scheduled"

    @classmethod
    def from_env(cls, value: str | None, default: "EpisodeStatus") -> "EpisodeStatus":
        try:
            return cls(value.lower()) if value else default
        except ValueError:
            return default


class TestListenMCPServer(unittest.IsolatedAsyncioTestCase):
    podcast_id = None
    episode_id = None
    status = EpisodeStatus.from_env(os.getenv("STATUS"), EpisodeStatus.PUBLISHED)

    @classmethod
    def setUpClass(cls):
        asyncio.run(cls._fetch_fixtures())

    @classmethod
    async def _fetch_fixtures(cls):
        """Fetch shared fixture data (podcast_id, episode_id) used by dependent tests."""
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()

                my_podcasts = json.loads(
                    (await session.call_tool("get_my_podcasts", {})).content[0].text
                )
                cls.podcast_id = my_podcasts[0]["id"]
                # print("Fetched podcast_id:", cls.podcast_id)

                result = await session.call_tool(
                    "get_podcast_episodes",
                    {"podcastId": cls.podcast_id, "status": cls.status},
                )
                if result is None:
                    raise ValueError("call_tool returned None")
                text = result.content[0].text
                try:
                    episodes_result = json.loads(text)
                except json.JSONDecodeError as e:
                    raise ValueError(f"Invalid JSON response: {text!r}") from e
                # print("Fetched episodes_result:", episodes_result)
                episodes = episodes_result.get("episodes", {}).get("data", [])
                if episodes:
                    cls.episode_id = episodes[0]["id"]
                else:
                    # Retry until episode_id is available
                    for _ in range(5):
                        await asyncio.sleep(2)
                        result = await session.call_tool(
                            "get_podcast_episodes",
                            {"podcastId": cls.podcast_id, "status": cls.status},
                        )
                        if result is None:
                            raise ValueError("call_tool returned None")
                        text = result.content[0].text
                        try:
                            episodes_result = json.loads(text)
                        except json.JSONDecodeError as e:
                            raise ValueError(f"Invalid JSON response: {text!r}") from e
                        # print("Retry fetched episodes_result:", episodes_result)
                        episodes = episodes_result.get("episodes", {}).get("data", [])
                        if episodes:
                            cls.episode_id = episodes[0]["id"]
                            # print("Fetched episode_id:", cls.episode_id)
                            break

    async def _call_tool(self, tool_name, args, parse_json=True):
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(tool_name, args)
                text = result.content[0].text
                if parse_json:
                    return json.loads(text)
                return text

    # 1. get_my_podcasts
    async def test_get_my_podcasts(self, test="get_my_podcasts"):
        result = await self._call_tool("get_my_podcasts", {})
        # print("Fetched my_podcasts:", result)
        self.assertIsInstance(result, list)
        self.assertGreater(len(result), 0)
        print(Fore.BLUE + f"OK  {test}")

    # 2. get_podcast_episodes
    async def test_get_podcast_episodes(self, test="get_podcast_episodes"):
        result = await self._call_tool(
            "get_podcast_episodes",
            {"podcastId": self.podcast_id, "status": self.status},
        )
        # print("Fetched podcast_episodes:", result)
        self.assertIsNotNone(result, "call_tool returned None")
        self.assertTrue(
            "episodes" in result and result["episodes"],
            "result.episodes is empty or missing",
        )
        self.assertIsInstance(result["episodes"], dict)
        self.assertTrue(
            "data" in result["episodes"] and result["episodes"]["data"],
            "result.episodes.data is empty or missing",
        )
        print(Fore.BLUE + f"OK  {test}")

    # 3. get_episode_transcript
    async def test_get_episode_transcript(self, test="get_episode_transcript"):
        self.assertIsNotNone(self.episode_id, "No episode_id available for this test")
        result = await self._call_tool(
            "get_episode_transcript", {"episodeId": self.episode_id}, parse_json=False
        )
        # print("Fetched episode_transcript:", result)
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 0)
        print(Fore.BLUE + f"OK  {test}")

    # 4. get_me
    async def test_get_me(self, test="get_me"):
        result = await self._call_tool("get_me", {})
        # print("Fetched me:", result)
        self.assertIsNotNone(result)
        self.assertIn("id", result)
        self.assertIn("name", result)
        self.assertIn("username", result)
        print(Fore.BLUE + f"OK  {test}")

    # 5. get_following_podcasts
    async def test_get_following_podcasts(self, test="get_following_podcasts"):
        result = await self._call_tool("get_following_podcasts", {})
        # print("Fetched following_podcasts:", result)
        self.assertIsInstance(result, list)
        print(Fore.BLUE + f"OK  {test}")

    # 6. get_playback_history
    async def test_get_playback_history(self, test="get_playback_history"):
        result = await self._call_tool("get_playback_history", {})
        # print("Fetched playback_history:", result)
        self.assertIsNotNone(result)
        self.assertIsInstance(result, list)
        if len(result) > 0:
            self.assertIsInstance(result[0], dict)
        print(Fore.BLUE + f"OK  {test}")

    # 7. search_podcasts
    async def test_search_podcasts(self, test="search_podcasts"):
        result = await self._call_tool("search_podcasts", {"query": "podcast"})
        # print("Fetched search_podcasts:", result)
        self.assertIsNotNone(result)
        print(Fore.BLUE + f"OK  {test}")

    # 8. search_users
    async def test_search_users(self, test="search_users"):
        result = await self._call_tool("search_users", {"query": "jkondo"})
        # print("Fetched search_users:", result)
        self.assertIsInstance(result, list)
        self.assertIsNotNone(result)
        print(Fore.BLUE + f"OK  {test}")

    # 9. get_podcast
    async def test_get_podcast(self, test="get_podcast"):
        result = await self._call_tool("get_podcast", {"podcastId": self.podcast_id})
        # print("Fetched get_podcast:", result)
        self.assertIsNotNone(result)
        print(Fore.BLUE + f"OK  {test}")

    # 10. get_episode
    async def test_get_episode(self, test="get_episode"):
        self.assertIsNotNone(self.episode_id, "No episode_id available for this test")
        result = await self._call_tool("get_episode", {"episodeId": self.episode_id})
        # print("Fetched get_episode:", result)
        self.assertIsNotNone(result)
        print(Fore.BLUE + f"OK  {test}")

    # 11. get_my_episode_reviews
    async def test_get_my_episode_reviews(self, test="get_my_episode_reviews"):
        result = await self._call_tool("get_my_episode_reviews", {})
        # print("Fetched get_my_episode_reviews:", result)
        self.assertIsNotNone(result)
        print(Fore.BLUE + f"OK  {test}")


if __name__ == "__main__":
    unittest.main()
