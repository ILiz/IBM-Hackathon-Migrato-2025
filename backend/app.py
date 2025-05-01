import random
from datetime import datetime

import requests
from flask import Flask, request, jsonify, session
from flask_cors import CORS

app = Flask(__name__)
app.secret_key = 'super-secret-key'

# Enable CORS for all domains
CORS(app, supports_credentials=True)

# Set your IBM API key and endpoint
IBM_API_KEY = "u3z2MxL8x_KeithCpiwH5g_Neszvq6d-9KntTQQJ8MJa"
IBM_ENDPOINT = "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29"
IAM_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token"

submitted_ideas = []
users = {'alice': 'password123', 'bob': 'mypassword'}


def get_ibm_auth_token():
    response = requests.post(IAM_TOKEN_URL, data={
        "apikey": IBM_API_KEY,
        "grant_type": "urn:ibm:params:oauth:grant-type:apikey"
    }, headers={"Content-Type": "application/x-www-form-urlencoded"})

    if response.status_code != 200:
        raise Exception("Failed to retrieve IAM token")

    return response.json()["access_token"]


@app.route('/api/message', methods=['POST'])
def handle_message():
    data = request.get_json()
    method = data.get('method', '').strip().lower()
    user_message = data.get('message', '')

    headers = {
        "Authorization": f"Bearer {get_ibm_auth_token()}",
        "Content-Type": "application/json"
    }

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    if method != 'regenerate':
        message = f"""
        You are a creative assistant.
    
        Given the user's idea, generate the following:
        1. A clear, engaging title that captures the concept.
        2. An expanding paragraph explaining the idea in detail, but max 5 sentences.
        3. A vivid, descriptive image prompt suitable for a generative AI art tool.
    
        Don't repeat yourself. Keep it simple.
    
        User idea: "{user_message}"
    
        Format the response like:
        ---
        Title: <your title here>
    
        Expansion: <your paragraph here>
    
        Image Prompt: <your detailed image prompt here>
    
        END.
        ---
        """
    else:
        message = f"""
        You are a creative assistant.

        Given the user's idea, rephrase it and give a slight twist to the idea:
        1. A clear, engaging title that captures the concept.
        2. An expanding paragraph explaining the idea in detail, but max 5 sentences.
        3. A vivid, descriptive image prompt suitable for a generative AI art tool.

        Don't repeat yourself. Keep it simple.

        User idea: "{user_message}"

        Format the response like:
        ---
        Title: <your title here>

        Expansion: <your paragraph here>

        Image Prompt: <your detailed image prompt here>

        END.
        ---
        """

    payload = {
        "input": message,
        "parameters": {
            "decoding_method": "greedy",
            "max_new_tokens": 900,
            "min_new_tokens": 0,
            "repetition_penalty": 1,
            "stop_sequences": ["END."]
        },
        "model_id": "ibm/granite-3-8b-instruct",
        "project_id": "219f53e7-510a-4f1f-966f-99cd06e13df0",
        "moderations": {
            "hap": {
                "input": {
                    "enabled": True,
                    "threshold": 0.5,
                    "mask": {
                        "remove_entity_value": True
                    }
                },
                "output": {
                    "enabled": True,
                    "threshold": 0.5,
                    "mask": {
                        "remove_entity_value": True
                    }
                }
            },
            "pii": {
                "input": {
                    "enabled": True,
                    "threshold": 0.5,
                    "mask": {
                        "remove_entity_value": True
                    }
                },
                "output": {
                    "enabled": True,
                    "threshold": 0.5,
                    "mask": {
                        "remove_entity_value": True
                    }
                }
            }
        }
    }

    try:
        response = requests.post(IBM_ENDPOINT, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        bot_reply = data.get('results', [{}])[0].get('generated_text', 'No response from model.')

        return jsonify({"reply": bot_reply})

    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/submit_idea', methods=['POST'])
def submit_idea():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    idea_text = data.get('text')

    if not idea_text:
        return jsonify({'error': 'Missing idea text'}), 400

    idea_entry = {
        'text': idea_text,
        'date': datetime.now().strftime("%Y-%m-%d %H:%M"),
        'likes': 0,
        'comments': [],
        'author': session['username']
    }

    submitted_ideas.append(idea_entry)

    return jsonify({'message': 'Idea submitted successfully', 'idea': idea_entry})


@app.route('/api/my_ideas', methods=['GET'])
def get_ideas():
    return jsonify(submitted_ideas)


@app.route('/api/random_idea', methods=['POST'])
def random_idea():
    if not submitted_ideas:
        return jsonify({'error': 'No ideas available'}), 404

    data = request.get_json()
    user = data.get('userId')
    if user != 'alice':
        return jsonify(random.choice(submitted_ideas))
    return jsonify({'error': 'No ideas available'}), 404


@app.route('/api/like_idea', methods=['POST'])
def like_idea():
    data = request.get_json()
    idea_text = data.get('text')

    for idea in submitted_ideas:
        if idea['text'] == idea_text:
            idea['likes'] += 1
            return jsonify({'message': 'Like recorded', 'likes': idea['likes']})

    return jsonify({'error': 'Idea not found'}), 404


@app.route('/api/comment_idea', methods=['POST'])
def comment_idea():
    data = request.get_json()
    idea_text = data.get('text')
    comment = data.get('comment')

    for idea in submitted_ideas:
        if idea['text'] == idea_text:
            idea['comments'].append(comment)
            return jsonify({'message': 'Comment added', 'comments': idea['comments']})

    return jsonify({'error': 'Idea not found'}), 404


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if username in users and users[username] == password:
        session['username'] = username
        return jsonify({'message': 'Login successful', 'user': username})
    return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({'message': 'Logged out'})


if __name__ == '__main__':
    app.run(debug=True)
