# PC-030M20AT1 — Answerable Discovery Question Guard

Live UAT showed the Floating Coach opening with two statements and a reply box, but no actual question. The older Decision Lab dialogue supplied `conversation.nextQuestion` with status text such as “I have enough context to simulate…”; M20AT trusted that field even when it was not a question.

M20AT1 fixes the boundary:
- only inherited text ending in `?` is accepted as the opening question;
- SELL/REDUCE otherwise falls back to `What would you like the released cash to accomplish?`;
- BUY/ADD otherwise falls back to `What outcome would make this idea worthwhile for you?`;
- valid existing Coach G questions are preserved;
- all session and no-mutation behavior remains unchanged.
