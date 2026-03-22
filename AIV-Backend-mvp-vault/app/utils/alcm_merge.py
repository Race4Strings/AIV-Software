"""ALCM Deep-Merge Utility.

Provides a recursive dictionary merge for partial updates to the ALCM
(Artificial Life Conception Model) JSON data on Twin records.

Rules:
  - Dicts merge recursively (nested dicts don't get replaced entirely)
  - Lists replace entirely (no list merging — too ambiguous)
  - None values in updates are skipped (don't overwrite with None)
  - Returns a new dict (does not mutate the original)
"""

from copy import deepcopy
from typing import Any


def deep_merge(base: dict, updates: dict) -> dict:
    """Recursively merge `updates` into `base`, returning a new dict.
    
    Args:
        base: The existing ALCM data dict.
        updates: Partial updates to merge in.
        
    Returns:
        A new merged dict — `base` is not mutated.
        
    Examples:
        >>> deep_merge(
        ...     {"personality": {"values": ["honesty"], "humor_style": "dry"}},
        ...     {"personality": {"no_go_topics": ["divorce"]}}
        ... )
        {'personality': {'values': ['honesty'], 'humor_style': 'dry', 'no_go_topics': ['divorce']}}
    """
    result = deepcopy(base)
    
    for key, value in updates.items():
        # Skip None values — don't overwrite existing data with None
        if value is None:
            continue
        
        # If both sides are dicts, recurse
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            # Lists, scalars, and new keys: replace entirely
            result[key] = deepcopy(value)
    
    return result


if __name__ == "__main__":
    """Inline validation tests for the deep-merge utility."""
    
    # --- Test 1: Basic nested merge ---
    base = {
        "personality": {
            "communication_style": "casual",
            "values": ["honesty", "loyalty"],
            "no_go_topics": ["politics"],
            "humor_style": "dry",
        },
        "knowledge": {
            "career_highlights": ["Grammy Award"],
            "expertise_areas": ["music"],
        },
    }
    updates = {
        "personality": {
            "no_go_topics": ["divorce"],  # List replaces entirely
        }
    }
    merged = deep_merge(base, updates)
    
    assert merged["personality"]["communication_style"] == "casual", "Should preserve untouched fields"
    assert merged["personality"]["values"] == ["honesty", "loyalty"], "Should preserve sibling fields"
    assert merged["personality"]["no_go_topics"] == ["divorce"], "Lists should replace entirely"
    assert merged["personality"]["humor_style"] == "dry", "Should preserve other sibling fields"
    assert merged["knowledge"]["career_highlights"] == ["Grammy Award"], "Should preserve other top-level sections"
    print("✅ Test 1 passed: Basic nested merge")
    
    # --- Test 2: None values are skipped ---
    base2 = {"personality": {"values": ["honesty"]}, "knowledge": {"awards": ["Oscar"]}}
    updates2 = {"personality": None, "knowledge": {"awards": ["Emmy"]}}
    merged2 = deep_merge(base2, updates2)
    
    assert merged2["personality"]["values"] == ["honesty"], "None updates should be skipped"
    assert merged2["knowledge"]["awards"] == ["Emmy"], "Non-None updates should apply"
    print("✅ Test 2 passed: None values skipped")
    
    # --- Test 3: New keys are added ---
    base3 = {"personality": {"values": ["honesty"]}}
    updates3 = {"social_media": {"instagram": "@johndoe"}}
    merged3 = deep_merge(base3, updates3)
    
    assert merged3["social_media"]["instagram"] == "@johndoe", "New keys should be added"
    assert merged3["personality"]["values"] == ["honesty"], "Existing keys should be preserved"
    print("✅ Test 3 passed: New keys added")
    
    # --- Test 4: Original is not mutated ---
    base4 = {"personality": {"values": ["honesty"]}}
    updates4 = {"personality": {"values": ["courage"]}}
    merged4 = deep_merge(base4, updates4)
    
    assert base4["personality"]["values"] == ["honesty"], "Original must not be mutated"
    assert merged4["personality"]["values"] == ["courage"], "Merged should have new value"
    print("✅ Test 4 passed: Original not mutated")
    
    # --- Test 5: Empty dicts ---
    assert deep_merge({}, {"a": 1}) == {"a": 1}, "Merge into empty base"
    assert deep_merge({"a": 1}, {}) == {"a": 1}, "Merge empty updates"
    assert deep_merge({}, {}) == {}, "Both empty"
    print("✅ Test 5 passed: Empty dicts")
    
    # --- Test 6: Deep nesting (3+ levels) ---
    base6 = {"a": {"b": {"c": {"d": 1, "e": 2}}}}
    updates6 = {"a": {"b": {"c": {"e": 99, "f": 3}}}}
    merged6 = deep_merge(base6, updates6)
    
    assert merged6["a"]["b"]["c"]["d"] == 1, "Deep untouched field preserved"
    assert merged6["a"]["b"]["c"]["e"] == 99, "Deep field updated"
    assert merged6["a"]["b"]["c"]["f"] == 3, "Deep new field added"
    print("✅ Test 6 passed: Deep nesting (3+ levels)")
    
    print("\n🎉 All ALCM deep-merge tests passed!")
