from rest_framework.test import APITestCase


class PredictEndpointTests(APITestCase):
    url = "/api/predict/"

    def test_obvious_spam_is_classified_as_spam(self):
        text = ("WINNER!! As a valued network customer you have been selected "
                "to receive a $900 prize reward! To claim call 09061701461. "
                "Claim code KL341. Valid 12 hours only.")
        response = self.client.post(self.url, {"text": text}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["label"], "SPAM")
        self.assertTrue(response.data["is_spam"])
        self.assertIn("spam_probability", response.data)

    def test_obvious_ham_is_classified_as_not_spam(self):
        text = "Hey, are we still on for lunch tomorrow at 1pm? Let me know."
        response = self.client.post(self.url, {"text": text}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["label"], "NOT SPAM")
        self.assertFalse(response.data["is_spam"])

    def test_empty_text_is_rejected(self):
        response = self.client.post(self.url, {"text": ""}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_missing_text_field_is_rejected(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_excessively_large_input_is_rejected(self):
        text = "free money now! " * 2000  # well over MAX_TEXT_LENGTH
        response = self.client.post(self.url, {"text": text}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_malformed_json_body(self):
        response = self.client.post(
            self.url, data="{not valid json", content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)

    def test_wrong_field_name_is_rejected(self):
        response = self.client.post(self.url, {"message": "hello"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_get_not_allowed(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 405)

    def test_repeated_predictions_in_same_session_are_consistent(self):
        spam_text = "URGENT! You have won a FREE prize, call now to claim!!!"
        for _ in range(3):
            response = self.client.post(self.url, {"text": spam_text}, format="json")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["label"], "SPAM")

    def test_response_does_not_leak_internal_details(self):
        response = self.client.post(self.url, {}, format="json")
        body_str = str(response.data)
        self.assertNotIn("Traceback", body_str)
        self.assertNotIn("site-packages", body_str)


class ModelInfoEndpointTests(APITestCase):
    def test_model_info_returns_real_metrics(self):
        response = self.client.get("/api/model-info/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("selected_model", response.data)
        self.assertIn("test_metrics", response.data)
        self.assertIn("f1_spam", response.data["test_metrics"])
