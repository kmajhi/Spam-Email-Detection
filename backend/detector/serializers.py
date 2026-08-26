from rest_framework import serializers

MAX_TEXT_LENGTH = 20000


class PredictRequestSerializer(serializers.Serializer):
    text = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=MAX_TEXT_LENGTH,
        trim_whitespace=True,
        error_messages={
            "blank": "Email/message text must not be empty.",
            "required": "Field 'text' is required.",
            "max_length": f"Text exceeds the maximum length of {MAX_TEXT_LENGTH} characters.",
        },
    )
