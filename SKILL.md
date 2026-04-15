# SKILL.md — deaiify Plugin

## Overview
Enforces Shawn's "no em dashes" rule across all output by intercepting messages, detecting U+2013 (en dash) and U+2014 (em dash), and forcing a rewrite turn via embedded LLM correction.

## Purpose
- Eliminate the em-dash problem at the source
- Preserve content quality while removing AI-slop formatting
- Make the rule enforcement invisible to the user

## Features
- Detects U+2013 and U+2014 in outbound messages
- Calls embedded LLM to rewrite without dashes (preserves meaning, tone, style)
- Returns corrected output to user
- No change to U+002D (hyphen-minus in code)
- Meme-worthy README

## Usage
- Enabled via `openclaw.json` plugin config
- Runs on every message that might contain dashes
