from flask import Blueprint, jsonify, Response
from typing import Any, Dict, Tuple, Union
from ..utils.logger import LoggerSetup, with_error_handling

logger = LoggerSetup.setup_logger(__name__)

JsonResponse = Union[Response, Tuple[Response, int]]

class BaseRouter:
    """
    Base class for route handlers with common functionality and error handling.
    """

    def __init__(self):
        self.logger = LoggerSetup.setup_logger(self.__class__.__name__)

    @staticmethod
    def success_response(data: Any = None, message: str = "Success") -> JsonResponse:
        """Create a standardized success response."""
        response = {
            "status": "success",
            "message": message
        }
        if data is not None:
            response["data"] = data
        return jsonify(response)

    @staticmethod
    def error_response(
        message: str,
        status_code: int = 400,
        errors: Any = None
    ) -> JsonResponse:
        """Create a standardized error response."""
        response = {
            "status": "error",
            "message": message
        }
        if errors is not None:
            response["errors"] = errors
        return jsonify(response), status_code

    @staticmethod
    def create_blueprint(name: str, import_name: str) -> Blueprint:
        """Create a Flask Blueprint with CORS headers."""
        blueprint = Blueprint(name, import_name)

        @blueprint.after_request
        def after_request(response: Response) -> Response:
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
            return response

        return blueprint
