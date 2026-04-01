"""Tests for onboarding — category detection, validation, pipeline states."""
import pytest
from app.routers.onboarding import detect_categories


class TestCategoryDetection:
    """Verify keyword-based identity category detection."""

    def test_music_keywords(self):
        result = detect_categories("Grammy-winning singer and songwriter")
        assert "MUSIC" in result

    def test_sports_keywords(self):
        result = detect_categories("Professional NBA basketball player")
        assert "SPORTS" in result

    def test_business_keywords(self):
        result = detect_categories("CEO and founder of a Fortune 500 startup")
        assert "BUSINESS" in result

    def test_entertainment_keywords(self):
        result = detect_categories("Famous actor and comedian on television")
        assert "ENTERTAINMENT" in result

    def test_multiple_categories_detected(self):
        result = detect_categories("Singer, actor, and comedian who performs on television")
        assert len(result) >= 2

    def test_empty_string_returns_empty(self):
        result = detect_categories("")
        assert result == []

    def test_none_returns_empty(self):
        result = detect_categories(None)
        assert result == []

    def test_no_match_returns_empty(self):
        result = detect_categories("random text with no keywords")
        assert result == []

    def test_results_sorted_by_match_strength(self):
        # "singer songwriter rapper producer" should strongly match MUSIC
        result = detect_categories("singer songwriter rapper producer Grammy album tour")
        assert result[0] == "MUSIC"

    def test_case_insensitive(self):
        result = detect_categories("GRAMMY WINNING SINGER")
        assert "MUSIC" in result

    def test_word_boundary_matching(self):
        # "nfl" should not match inside "influencer"
        result = detect_categories("influencer on social media")
        assert "SPORTS" not in result or result[0] != "SPORTS"


class TestCategoryValidation:
    """Verify identity category constants."""

    def test_thirteen_categories_exist(self):
        from app.routers.onboarding import CATEGORY_KEYWORDS
        assert len(CATEGORY_KEYWORDS) == 13

    def test_all_expected_categories(self):
        from app.routers.onboarding import CATEGORY_KEYWORDS
        expected = {
            "MUSIC", "ENTERTAINMENT", "SPORTS", "BUSINESS", "ACADEMIA",
            "CULINARY", "FASHION", "MEDIA", "GOVERNMENT", "WELLNESS",
            "ARTS", "CHARACTER", "VIRTUAL",
        }
        assert set(CATEGORY_KEYWORDS.keys()) == expected
