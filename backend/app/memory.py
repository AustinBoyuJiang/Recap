import time
import math
import agent
from collections import defaultdict
from sortedcontainers import SortedSet


def merge_pairs(pairs):
    counter = defaultdict(int)
    for key, value in pairs:
        counter[key] += value
    return list(counter.items())


def split_sentence(sentence):
    banned_keywords = {
        'english', 'vocabulary', 'conversation', 'context', 'word', 'words',
        'sentence', 'question', 'topic', 'topics', 'practice', 'talk', 'language',
        'learn', 'learning', 'thing', 'something', 'today', 'now', 'time', 'sentence'
    }
    sentence = sentence.lower()
    system_prompt = (
        "You are a vocabulary knowledge extraction engine. "
        "Given any English sentence, extract only the specific topic-related content (eg. food topic, sport topic, etc.)\
         words that a learner should explicitly memorize — such as concrete nouns or useful adjectives in the form of \
         Python string list."
        "For each word, return the lemmatized base form."
        "Exclude all linguistic or instructional terms like: 'practice', 'word', 'words', 'vocabulary', 'English',\
         'sentence', 'question', 'topic', 'talk', 'language', 'conversation', and so on. "
        "Also exclude generic actions like: 'do', 'make', 'say', 'help', 'learn' and so on and stop words like 'a', \
        'the, 'in', 'of', and so on."
        "Only include words that are related to the current topic in the conversation."
    )
    user_message = f"Sentence: \"{sentence}\""

    response = agent.client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        temperature=0
    )

    raw = response.choices[0].message.content.strip()
    try:
        filtered = eval(raw)
        return [((w, 1), 1) for w in filtered if isinstance(w, str) and w.lower() not in banned_keywords]
    except:
        return []


def split_word(word):
    common_prefixes = ['un', 're', 'in', 'im', 'il', 'ir', 'dis', 'en', 'em', 'non', 'over', 'mis', 'sub', 'pre',
                       'inter', 'fore', 'de', 'trans', 'super', 'semi', 'anti', 'mid', 'under']
    common_suffixes = ['s', 'able', 'ible', 'al', 'ial', 'ed', 'en', 'er', 'est', 'ful', 'ic', 'ing', 'ion', 'tion',
                       'ation',
                       'ition', 'ity', 'ty', 'ive', 'ative', 'itive', 'less', 'ly', 'ment', 'ness', 'ous', 'eous',
                       'ious', 'es', 'y']
    prefixes = []
    suffixes = []
    root = word
    done = False
    while not done:
        done = True
        for p in sorted(common_prefixes, key=lambda x: -len(x)):
            if root.startswith(p):
                prefixes.append(p)
                root = root[len(p):]
                done = False
                break
    done = False
    while not done:
        done = True
        for s in sorted(common_suffixes, key=lambda x: -len(x)):
            if root.endswith(s):
                suffixes.insert(0, s)  # insert at front to preserve order
                root = root[:-len(s)]
                done = False
                break
    return merge_pairs(
        [((x, 2), len(x) / len(word)) for x in (prefixes + suffixes)] + [((x, 3), 1 / len(word)) for x in root])


def split_morpheme(morpheme):
    return merge_pairs([((x, 3), 1 / len(morpheme)) for x in morpheme])


def split_letter(letter):
    return []


def update_ease_factor(ef, grade, sensitivity=1.5):
    delta = sensitivity * (0.3 - (5 - grade) * (0.2 + (5 - grade) * 0.08))
    ef += delta
    return max(ef, 1.3)


retention_threshold = 0.6
decay_factor = math.log(2) / 30  # half-life time of 30 seconds
nodes = [{}, {}, {}, {}]
history = []
retention_queue = SortedSet()
split_function = [split_sentence, split_word, split_morpheme, split_letter]


def new_node(item, depth):
    time_ = time.time()
    retention = 1
    ease_factor = 2.5
    time_last = time_ + math.log(retention) * ease_factor / decay_factor
    review_interval = - math.log(retention_threshold) * ease_factor / decay_factor
    time_next = time_last + review_interval
    retention_queue.add((time_next, (item, depth)))
    return {
        "retention": retention,
        "time": time_,
        "time_last": time_last,
        "time_next": time_next,
        "decay_factor": decay_factor,
        "ease_factor": ease_factor,
        "review_interval": review_interval,
        "next": split_function[depth](item),
        "history": {
            time_: {
                "time_last": time_last,
                "ease_factor": ease_factor,
            }
        },
    }


def update_retention(item, depth):
    nodes[depth][item]["time"] = time.time()
    time_ = nodes[depth][item]["time"]
    time_last = nodes[depth][item]["time_last"]
    decay_factor = nodes[depth][item]["decay_factor"]
    ease_factor = nodes[depth][item]["ease_factor"]
    nodes[depth][item]["retention"] = math.exp(-decay_factor / ease_factor * (time_ - time_last))


def update_node(item, grade, weight, depth):
    if item not in nodes[depth]:
        nodes[depth][item] = new_node(item, depth)
    time_ = time.time()
    time_last = nodes[depth][item]["time_last"] + (time_ - nodes[depth][item]["time_last"])  # * weight
    nodes[depth][item]["time_last"] = time_last
    ease_factor = update_ease_factor(nodes[depth][item]["ease_factor"], grade)
    nodes[depth][item]["ease_factor"] = ease_factor
    nodes[depth][item]["history"][time_] = {
        "time_last": time_last,
        "ease_factor": ease_factor,
    }
    decay_factor = nodes[depth][item]["decay_factor"]
    time_next = nodes[depth][item]["time_next"]
    retention_queue.discard((time_next, (item, depth)))
    review_interval = - math.log(retention_threshold) * ease_factor / decay_factor
    time_next = time_last + review_interval
    nodes[depth][item]["review_interval"] = review_interval
    nodes[depth][item]["time_next"] = time_next
    retention_queue.add((time_next, (item, depth)))
    update_retention(item, depth)


def update(item, grade, depth=0, weight=1):
    if depth == 1:
        history.append((time.time(), item))
    update_node(item, grade, weight, depth)
    for (item_next, depth_next), w in nodes[depth][item]["next"]:
        update(item_next, grade, depth_next, weight * w)


def update_all():
    for depth in range(4):
        for item in nodes[depth].keys():
            update_retention(item, depth)


def query():
    queue = [x[1][0] for x in retention_queue if
             x[0] < time.time()
             and x[1][1] in {1}
             and len(x[1][0]) > 2
             ]
    return {
        "nodes": nodes,
        "retention_queue": queue
    }
